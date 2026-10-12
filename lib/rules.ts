import type { Crew, RuleResult } from "./types";

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

/** Rule thresholds. Preserved from the original prototype verbatim. */
export function evalRules(c: Crew): RuleResult[] {
  const m = mean(c.H.hr.slice(-6));
  const ra = m / c.bhr;
  const pc = Math.round((ra - 1) * 100);
  return [
    {
      n: "Heart rate",
      th: "+30% watch, +50% alert over baseline",
      val: `${Math.round(m)} bpm`,
      lv: ra > 1.5 ? 2 : ra > 1.3 ? 1 : 0,
      why: `Heart rate averaged ${Math.round(m)} bpm, ${pc}% above baseline of ${c.bhr}`,
    },
    {
      n: "Oxygen",
      th: "below 94% watch, below 90% alert",
      val: `${c.spo2.toFixed(1)}%`,
      lv: c.spo2 < 90 ? 2 : c.spo2 < 94 ? 1 : 0,
      why: `Blood oxygen at ${c.spo2.toFixed(1)}%`,
    },
    {
      n: "Sleep",
      th: "3-night average below 5.5 h watch, 4.5 h alert",
      val: `${c.sleep.toFixed(1)} h`,
      lv: c.sleep < 4.5 ? 2 : c.sleep < 5.5 ? 1 : 0,
      why: `Sleep averaged ${c.sleep.toFixed(1)} h over 3 nights`,
    },
    {
      n: "Stress",
      th: "index above 75 watch, 90 alert",
      val: `${Math.round(c.stress)}`,
      lv: c.stress > 90 ? 2 : c.stress > 75 ? 1 : 0,
      why: `Stress index at ${Math.round(c.stress)}`,
    },
    {
      n: "Radiation",
      th: "rate 1 mSv/h or more, or dose at 80% / 95% of 250 mSv",
      val: `${c.dose.toFixed(0)} mSv`,
      lv:
        c.dose >= 237.5 ? 2 : c.dose >= 200 || c.rate >= 1 ? 1 : 0,
      why: `${c.rate >= 1 ? `Dose rate ${c.rate.toFixed(1)} mSv/h, ` : ""}30-day dose ${c.dose.toFixed(0)} of 250 mSv`,
    },
  ];
}
