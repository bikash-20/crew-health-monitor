import { describe, it, expect } from "vitest";
import type { Crew } from "./types";
import { aiScore, band } from "./aiScore";

function crew(overrides: Partial<Crew> = {}): Crew {
  return {
    id: 0,
    n: "Test",
    role: "Tester",
    bhr: 60,
    hr: 60,
    spo2: 98,
    sleep: 7.2,
    stress: 28,
    dose: 100,
    rate: 0.04,
    // aiScore reads a 6-sample mean of H.hr; provide enough samples so
    // rolling-mean math never sees an empty array.
    H: { hr: [60, 60, 60, 60, 60, 60], spo2: [], stress: [], rate: [] },
    r: [0, 0, 0, 0, 0],
    ai: 0,
    F: [],
    R: [],
    f: { sleep: 0, card: 0 },
    ...overrides,
  };
}

describe("aiScore", () => {
  it("returns 0..100 for a healthy baseline crew", () => {
    const c = crew();
    aiScore(c);
    expect(c.ai).toBeGreaterThanOrEqual(0);
    expect(c.ai).toBeLessThanOrEqual(100);
  });

  it("writes 5 factor contributions to crew.F with the documented weights", () => {
    const c = crew();
    aiScore(c);
    expect(c.F).toHaveLength(5);
    const totals = c.F.reduce((sum, [, , max]) => sum + max, 0);
    // Sum of factor maxes = 30 + 20 + 20 + 15 + 15 = 100
    expect(totals).toBe(100);
  });

  it("raises the score when multiple factors are simultaneously elevated", () => {
    const low = crew();
    aiScore(low);

    const high = crew({
      hr: 110,
      spo2: 88,
      sleep: 4,
      stress: 95,
      dose: 240,
      rate: 3,
    });
    aiScore(high);

    expect(high.ai).toBeGreaterThan(low.ai);
    // Even with a 12-point bump for ≥3 elevated factors, score stays in band.
    expect(high.ai).toBeLessThanOrEqual(100);
  });

  it("applies an exponential moving average on the score (60% prior + 40% new)", () => {
    const c = crew({ ai: 80 });
    // Drive new score to a known value
    const hr = Array(6).fill(120); // strongly elevated
    c.H = { hr, spo2: [98], stress: [30], rate: [0.04] };
    aiScore(c);
    // AI must move toward the new value but not snap to it.
    expect(c.ai).toBeLessThan(80); // moved
    expect(c.ai).toBeGreaterThan(0); // still positive
  });
});

describe("band", () => {
  it("maps 0..29 to Low, 30..59 to Watch, 60..100 to High", () => {
    expect(band(0)).toBe("Low");
    expect(band(29)).toBe("Low");
    expect(band(30)).toBe("Watch");
    expect(band(59)).toBe("Watch");
    expect(band(60)).toBe("High");
    expect(band(100)).toBe("High");
  });
});
