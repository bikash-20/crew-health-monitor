/**
 * OpenRouter integration with a model cascade.
 *
 * On first use we fetch https://openrouter.ai/api/v1/models (no auth required
 * for the listing), score each chat-capable model, and cache the top 5 for
 * 10 minutes. Each request tries them in order with an 8s timeout, falling
 * through to the next on failure. 401/403 aborts the whole cascade because
 * the key is bad — retrying with the same key won't help.
 *
 * SERVER ONLY. Imported only by app/api/* route handlers.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/models";
const CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const CACHE_TTL_MS = 10 * 60 * 1000;
const PER_REQUEST_TIMEOUT_MS = 8_000;

const PREFERRED_FAMILIES = [
  "llama",
  "qwen",
  "gemini",
  "deepseek",
  "glm",
  "mistral",
  "claude",
  "gpt",
  "command",
];

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

let cascadeCache: { at: number; ids: string[] } | null = null;
let cascadeInflight: Promise<string[]> | null = null;

function isChatCapable(m: OpenRouterModel): boolean {
  const out = m.architecture?.output_modalities ?? [];
  if (out.length > 0) return out.includes("text");
  const modality = m.architecture?.modality ?? "";
  return modality.includes("text") || modality.includes("->text");
}

function isFree(m: OpenRouterModel): boolean {
  // OpenRouter's canonical signal is the `:free` suffix on the model id
  // (e.g. `meta-llama/llama-3.3-70b-instruct:free`). Pricing values are
  // per-token dollars and are essentially never exactly 0, so we can't
  // detect free models from the `pricing` field alone.
  return m.id.toLowerCase().endsWith(":free");
}

function rank(m: OpenRouterModel): number {
  const p = parseFloat(m.pricing?.prompt ?? "1") || 1;
  const c = parseFloat(m.pricing?.completion ?? "1") || 1;
  let score = 0;
  if (isFree(m)) score += 1000;
  if ((m.context_length ?? 0) >= 32_000) score += 100;
  const id = m.id.toLowerCase();
  if (PREFERRED_FAMILIES.some((f) => id.includes(f))) score += 50;
  // Cheaper models win among the same tier. We still rank by family and
  // context first, so this only breaks ties.
  score -= (p + c) * 10;
  return score;
}

async function loadCascade(): Promise<string[]> {
  const res = await fetch(ENDPOINT, {
    headers: { Accept: "application/json" },
    // short cache, server-side
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`openrouter models list failed: ${res.status}`);
  const data = (await res.json()) as { data?: OpenRouterModel[] };
  const list = (data.data ?? []).filter(isChatCapable);
  list.sort((a, b) => rank(b) - rank(a));
  const ids = list.slice(0, 5).map((m) => m.id);
  if (ids.length === 0) throw new Error("openrouter returned no chat models");
  return ids;
}

export async function getCascade(): Promise<string[]> {
  const now = Date.now();
  if (cascadeCache && now - cascadeCache.at < CACHE_TTL_MS) {
    return cascadeCache.ids;
  }
  if (cascadeInflight) return cascadeInflight;
  cascadeInflight = loadCascade()
    .then((ids) => {
      cascadeCache = { at: Date.now(), ids };
      return ids;
    })
    .finally(() => {
      cascadeInflight = null;
    });
  return cascadeInflight;
}

export interface CascadeMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CascadeOpts {
  temperature?: number;
  maxTokens?: number;
}

/** One non-streaming cascade call. Returns the text + which model served. */
export async function callCascade(
  messages: CascadeMessage[],
  opts: CascadeOpts = {}
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set on the server");
  }
  const ids = await getCascade();

  let lastErr: unknown = null;
  for (const model of ids) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      PER_REQUEST_TIMEOUT_MS
    );
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://crew-health-monitor.vercel.app",
          "X-Title": "Crew Health Monitor",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 600,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error(`openrouter auth failed (${res.status}) — check OPENROUTER_API_KEY`);
      }
      if (!res.ok) {
        lastErr = new Error(`model ${model} → ${res.status}`);
        console.warn("[openrouter] model failed", model, res.status);
        continue;
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) {
        lastErr = new Error(`model ${model} returned empty content`);
        continue;
      }
      console.log("[openrouter] served by:", model);
      return { text, model };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("openrouter auth")) {
        throw err;
      }
      lastErr = err;
      console.warn("[openrouter] model threw", model, err);
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `all cascade models failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}

/**
 * Streaming cascade. Yields raw text deltas. Uses OpenAI-style SSE format.
 * The route handler is responsible for converting those to its own wire format.
 */
export async function* streamCascade(
  messages: CascadeMessage[],
  opts: CascadeOpts = {}
): AsyncGenerator<{ delta: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set on the server");
  }
  const ids = await getCascade();

  let lastErr: unknown = null;
  for (const model of ids) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      PER_REQUEST_TIMEOUT_MS * 2
    );
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://crew-health-monitor.vercel.app",
          "X-Title": "Crew Health Monitor",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.5,
          max_tokens: opts.maxTokens ?? 800,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error(`openrouter auth failed (${res.status})`);
      }
      if (!res.ok || !res.body) {
        lastErr = new Error(`model ${model} → ${res.status}`);
        continue;
      }
      console.log("[openrouter] stream served by:", model);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") return;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield { delta, model };
          } catch {
            // ignore malformed chunk
          }
        }
      }
      return;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("openrouter auth")) {
        throw err;
      }
      lastErr = err;
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `all cascade models failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}
