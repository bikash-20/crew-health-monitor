import { NextRequest, NextResponse } from "next/server";
import { callCascade } from "@/lib/openrouter";
import { snapshotForLLM } from "@/lib/serialize";
import type { Crew } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a flight surgeon on a long-duration deep-space mission. You receive a structured snapshot of one crew member and must produce a concise status brief.

Hard rules:
- Use ONLY the data in the snapshot. Never invent values, names, or events.
- If a value is missing, omit it rather than guess.
- Plain English. No emojis. No exclamations.
- Markdown output with exactly three sections:
  1. **Status** — one line, the worst current condition.
  2. **Active concerns** — bulleted list, omit section if none.
  3. **Suggested next step** — one or two concrete actions, or "continue the normal schedule" if nothing is wrong.
- Do NOT raise new alerts. Alerts are decided by the rules engine, not you.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { crew: Crew };
    if (!body?.crew) {
      return NextResponse.json({ error: "missing crew" }, { status: 400 });
    }
    const snapshot = snapshotForLLM(body.crew, []);
    const { text, model } = await callCascade([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Write the brief for the following crew member.\n\n${snapshot}`,
      },
    ]);
    return NextResponse.json({ text, model });
  } catch (err) {
    console.error("[/api/brief]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
