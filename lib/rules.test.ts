import { describe, it, expect } from "vitest";
import type { Crew } from "./types";
import { evalRules } from "./rules";

/** Build a crew with specific vitals — used to drive rule thresholds
 *  through their boundary conditions without relying on the simulation. */
function crew(overrides: Partial<Crew> = {}): Crew {
  const base: Crew = {
    id: 0,
    n: "Test Crew",
    role: "Tester",
    bhr: 60,
    hr: 60,
    spo2: 98,
    sleep: 7.2,
    stress: 28,
    dose: 100,
    rate: 0.04,
    H: { hr: [], spo2: [], stress: [], rate: [] },
    r: [0, 0, 0, 0, 0],
    ai: 0,
    F: [],
    R: [],
    f: { sleep: 0, card: 0 },
  };
  return { ...base, ...overrides };
}

describe("evalRules", () => {
  it("returns 5 rules in a stable order", () => {
    const out = evalRules(crew());
    expect(out.map((r) => r.n)).toEqual([
      "Heart rate",
      "Oxygen",
      "Sleep",
      "Stress",
      "Radiation",
    ]);
    expect(out).toHaveLength(5);
  });

  it("classifies heart rate at the +30% / +50% boundaries", () => {
    // Need 6 samples so the rolling mean has full coverage.
    // Note: thresholds are strict `>`, so a mean of exactly 78 bpm over a
    // baseline of 60 (= 1.30x) is still "stable"; 78.1 is "watch".
    const sample = (mean: number) =>
      crew({ bhr: 60, H: { hr: [mean, mean, mean, mean, mean, mean], spo2: [], stress: [], rate: [] } });

    expect(evalRules(sample(60))[0].lv).toBe(0); // 0%
    expect(evalRules(sample(78))[0].lv).toBe(0); // exactly +30%, still stable
    expect(evalRules(sample(78.1))[0].lv).toBe(1); // just over
    expect(evalRules(sample(90))[0].lv).toBe(1); // exactly +50%, still watch
    expect(evalRules(sample(90.1))[0].lv).toBe(2); // just over
  });

  it("classifies SpO2 at the 94% / 90% boundaries", () => {
    expect(evalRules(crew({ spo2: 95 }))[1].lv).toBe(0);
    expect(evalRules(crew({ spo2: 94 }))[1].lv).toBe(0); // boundary
    expect(evalRules(crew({ spo2: 93.9 }))[1].lv).toBe(1);
    expect(evalRules(crew({ spo2: 90 }))[1].lv).toBe(1); // boundary
    expect(evalRules(crew({ spo2: 89.9 }))[1].lv).toBe(2);
  });

  it("classifies sleep at the 5.5h / 4.5h boundaries", () => {
    expect(evalRules(crew({ sleep: 6 }))[2].lv).toBe(0);
    expect(evalRules(crew({ sleep: 5.5 }))[2].lv).toBe(0);
    expect(evalRules(crew({ sleep: 5.4 }))[2].lv).toBe(1);
    expect(evalRules(crew({ sleep: 4.5 }))[2].lv).toBe(1);
    expect(evalRules(crew({ sleep: 4.4 }))[2].lv).toBe(2);
  });

  it("classifies stress at the 75 / 90 boundaries", () => {
    expect(evalRules(crew({ stress: 50 }))[3].lv).toBe(0);
    expect(evalRules(crew({ stress: 75 }))[3].lv).toBe(0);
    expect(evalRules(crew({ stress: 76 }))[3].lv).toBe(1);
    expect(evalRules(crew({ stress: 90 }))[3].lv).toBe(1);
    expect(evalRules(crew({ stress: 91 }))[3].lv).toBe(2);
  });

  it("classifies radiation by dose thresholds and rate", () => {
    // Thresholds: 80% of 250 mSv (= 200) trips watch; 95% of 250 mSv
    // (= 237.5) trips alert. The 237.5 boundary is inclusive (>=), so it
    // is already an alert at exactly that value.
    expect(evalRules(crew({ dose: 100, rate: 0.04 }))[4].lv).toBe(0);
    expect(evalRules(crew({ dose: 199, rate: 0.04 }))[4].lv).toBe(0);
    expect(evalRules(crew({ dose: 200, rate: 0.04 }))[4].lv).toBe(1);
    expect(evalRules(crew({ dose: 237.4, rate: 0.04 }))[4].lv).toBe(1);
    expect(evalRules(crew({ dose: 237.5, rate: 0.04 }))[4].lv).toBe(2);
    // Rate alone can trip the watch level
    expect(evalRules(crew({ dose: 100, rate: 1 }))[4].lv).toBe(1);
    expect(evalRules(crew({ dose: 100, rate: 3 }))[4].lv).toBe(1);
  });
});
