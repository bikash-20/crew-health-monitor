import type { Crew, FactorName, RuleResult } from "./types";

const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

/**
 * Deterministic AI risk score, ported from the original prototype.
 * Runs entirely in the browser — never makes a network call.
 */
export function aiScore(c: Crew): void {
  const m = mean(c.H.hr.slice(-6));
  const F: [FactorName, number, number][] = [
    ["Heart rate", cl((m / c.bhr - 1) / 0.5, 0, 1) * 30, 30],
    ["Oxygen", cl((98 - c.spo2) / 8, 0, 1) * 20, 20],
    ["Sleep", cl((7 - c.sleep) / 3.5, 0, 1) * 20, 20],
    ["Stress", cl((c.stress - 30) / 60, 0, 1) * 15, 15],
    [
      "Radiation",
      cl((c.dose - 165) / 85, 0, 1) * 10 + cl(c.rate / 3, 0, 1) * 5,
      15,
    ],
  ];
  let s = F.reduce((a, f) => a + f[1], 0);
  if (F.filter((f) => f[1] / f[2] > 0.3).length >= 3) s += 12;
  c.F = F;
  c.ai = c.ai * 0.6 + Math.min(100, s) * 0.4;
}

/** Pretty band label for a numeric score 0..100. */
export function band(s: number): "Low" | "Watch" | "High" {
  if (s < 30) return "Low";
  if (s < 60) return "Watch";
  return "High";
}

export type { RuleResult };
