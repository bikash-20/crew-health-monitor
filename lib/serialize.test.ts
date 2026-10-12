import { describe, it, expect } from "vitest";
import { snapshotForLLM } from "./serialize";
import { evalRules } from "./rules";
import { aiScore } from "./aiScore";
import type { Alert, Crew } from "./types";

function crew(): Crew {
  const c: Crew = {
    id: 0,
    n: "Cdr. Test",
    role: "Commander",
    bhr: 60,
    hr: 60,
    spo2: 98,
    sleep: 7.2,
    stress: 28,
    dose: 100,
    rate: 0.04,
    H: {
      hr: [60, 60, 60, 60, 60, 60],
      spo2: [98, 98, 98, 98, 98, 98],
      stress: [28, 28, 28, 28, 28, 28],
      rate: [0.04, 0.04, 0.04, 0.04, 0.04, 0.04],
    },
    r: [0, 0, 0, 0, 0],
    ai: 0,
    F: [],
    R: [],
    f: { sleep: 0, card: 0 },
  };
  c.R = evalRules(c);
  aiScore(c);
  return c;
}

describe("snapshotForLLM", () => {
  it("includes crew identity, vitals, AI score, and rule output", () => {
    const snap = snapshotForLLM(crew(), []);
    expect(snap).toContain("Cdr. Test");
    expect(snap).toContain("Commander");
    expect(snap).toContain("Baseline HR: 60 bpm");
    expect(snap).toContain("Deterministic AI risk score:");
    expect(snap).toContain("Worst rule level: Stable");
  });

  it("formats the active-scenario-flags line based on c.f", () => {
    const c = crew();
    c.f.card = 1;
    expect(snapshotForLLM(c, [])).toContain("cardiac strain");

    c.f.card = 0;
    c.f.sleep = 1;
    expect(snapshotForLLM(c, [])).toContain("sleep debt");

    c.f.card = 0;
    c.f.sleep = 0;
    expect(snapshotForLLM(c, [])).toContain("(none)");
  });

  it("limits recent alerts to 5 most recent and only for this crew", () => {
    const c = crew();
    const now = "Day 112 · 06:00";
    const mk = (id: string, crewIdx: 0 | 1 | 2, why: string): Alert => ({
      id,
      t: now,
      i: crewIdx,
      j: 0,
      n: "Heart rate",
      th: "",
      lv: 1,
      why,
      ai: 0,
      aiOn: true,
    });
    const alerts: Alert[] = [
      mk("a", 0, "alert-alpha"),
      mk("b", 0, "alert-beta"),
      mk("c", 1, "alert-charlie"), // wrong crew, must be excluded
      mk("d", 0, "alert-delta"),
      mk("e", 0, "alert-echo"),
      mk("f", 0, "alert-foxtrot"),
      mk("g", 0, "alert-golf"), // 6th most recent for this crew, must be excluded
    ];
    const snap = snapshotForLLM(c, alerts);
    // Wrong crew
    expect(snap).not.toContain("alert-charlie");
    // First 5 for this crew
    expect(snap).toContain("alert-alpha");
    expect(snap).toContain("alert-beta");
    expect(snap).toContain("alert-delta");
    expect(snap).toContain("alert-echo");
    expect(snap).toContain("alert-foxtrot");
    // 6th is trimmed
    expect(snap).not.toContain("alert-golf");
  });
});
