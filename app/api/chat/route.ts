import { NextRequest } from "next/server";
import { streamCascade } from "@/lib/openrouter";
import { snapshotForLLM } from "@/lib/serialize";
import type { Alert, Crew, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a flight surgeon on a long-duration deep-space mission. You answer follow-up questions from the surgeon on duty about one specific crew member. A structured snapshot of that crew member is provided in the first user message.

Hard rules:
- Use ONLY the data in the snapshot. If a value is needed but not present, say "not enough data" — never invent.
- Plain English. No emojis. No exclamation marks. Be terse.
- If the user asks about something unrelated to the snapshot, politely redirect.
- Do NOT raise new alerts or contradict the rules engine. You may explain what the rules already decided.`;

interface ChatRequestBody {
  crew: Crew;
  alerts: Alert[];
  messages: Pick<ChatMessage, "role" | "content">[];
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  if (!body?.crew) return new Response("missing crew", { status: 400 });

  const snapshot = snapshotForLLM(body.crew, body.alerts ?? []);

  // Trust boundary: only `user` turns from the client are trusted. Strip any
  // client-supplied "assistant" turns — they would let a caller forge the
  // conversation history and override prior instructions.
  const trustedUserTurns = (body.messages ?? [])
    .filter((m) => m.role === "user")
    .map((m) => ({ role: "user" as const, content: m.content }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Crew snapshot (reference for the rest of this conversation):\n\n${snapshot}`,
          },
          {
            role: "assistant",
            content: "Understood. I have the snapshot. What would you like to know?",
          },
          ...trustedUserTurns,
        ];

        let model = "unknown";
        for await (const chunk of streamCascade(messages, { temperature: 0.4 })) {
          model = chunk.model;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ delta: chunk.delta, model })}\n\n`
            )
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
