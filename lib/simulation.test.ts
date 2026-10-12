import { describe, it, expect } from "vitest";
import { mkCrew, seedCrew, step, clock } from "./simulation";

describe("mkCrew", () => {
  it("returns a stable baseline for a healthy crew", () => {
    const c = mkCrew(0);
    expect(c.bhr).toBeGreaterThan(0);
    expect(c.hr).toBe(c.bhr);
    expect(c.spo2).toBeCloseTo(98, 1);
    expect(c.sleep).toBeGreaterThan(5);
    expect(c.stress).toBeLessThan(50);
    expect(c.r).toEqual([0, 0, 0, 0, 0]);
  });

  it("produces three distinct crew members with different baselines", () => {
    const crew = [mkCrew(0), mkCrew(1), mkCrew(2)];
    const names = new Set(crew.map((c) => c.n));
    const roles = new Set(crew.map((c) => c.role));
    expect(names.size).toBe(3);
    expect(roles.size).toBe(3);
  });
});

describe("seedCrew", () => {
  it("returns 3 crew with non-empty history", () => {
    const crew = seedCrew();
    expect(crew).toHaveLength(3);
    for (const c of crew) {
      expect(c.H.hr.length).toBeGreaterThan(0);
      expect(c.H.spo2.length).toBeGreaterThan(0);
    }
  });

  it("accepts a custom warmup count", () => {
    const crew = seedCrew(5);
    expect(crew[0].H.hr.length).toBe(5);
  });
});

describe("step", () => {
  it("does not raise alerts when emitAlerts is false", () => {
    const crew = [mkCrew(0)];
    const alerts: unknown[] = [];
    step(crew, {
      storm: false,
      aiOn: true,
      emitAlerts: false,
      tick: 0,
      onAlert: (a) => alerts.push(a),
    });
    expect(alerts).toEqual([]);
  });

  it("mutates history arrays in place", () => {
    const crew = [mkCrew(0)];
    const before = crew[0].H.hr.length;
    step(crew, { storm: false, aiOn: true, emitAlerts: false, tick: 0 });
    expect(crew[0].H.hr.length).toBe(before + 1);
  });

  it("caps history arrays at 60 samples", () => {
    const crew = [mkCrew(0)];
    for (let i = 0; i < 200; i++) {
      step(crew, { storm: false, aiOn: true, emitAlerts: false, tick: 0 });
    }
    expect(crew[0].H.hr.length).toBeLessThanOrEqual(60);
  });
});

describe("clock", () => {
  it("starts at Day 112, 06:00 at tick 0", () => {
    expect(clock(0)).toBe("Day 112 · 06:00");
  });

  it("advances 30 minutes per tick", () => {
    // 2 ticks = 1 hour → 07:00
    expect(clock(2)).toBe("Day 112 · 07:00");
    // 48 ticks = 24h → Day 113, 06:00
    expect(clock(48)).toBe("Day 113 · 06:00");
  });
});
