import type { Alert, Crew } from "./types";
import { LEVEL_NAMES } from "./types";

/**
 * Compact, deterministic text snapshot of one crew member, suitable to feed
 * to an LLM. Numbers are rounded for readability.
 */
export function snapshotForLLM(c: Crew, alerts: Alert[]): string {
  const max = Math.max(...c.r);
  const active = c.R.filter((r) => r.lv > 0)
    .map((r) => `- ${r.n}: ${r.why} [${LEVEL_NAMES[r.lv]}]`)
    .join("\n");
  const recentAlerts = alerts
    .filter((a) => a.i === c.id)
    .slice(0, 5)
    .map((a) => `- ${a.t} ${LEVEL_NAMES[a.lv]}: ${a.why}`)
    .join("\n");
  const last = (arr: number[]) => arr[arr.length - 1] ?? 0;

  return [
    `Crew: ${c.n} (${c.role})`,
    `Baseline HR: ${c.bhr} bpm`,
    `Current HR: ${Math.round(c.hr)} bpm`,
    `Blood oxygen: ${c.spo2.toFixed(1)}%`,
    `Sleep (3-night avg): ${c.sleep.toFixed(1)} h`,
    `Stress index: ${Math.round(c.stress)} / 100`,
    `30-day radiation dose: ${c.dose.toFixed(0)} mSv (limit 250)`,
    `Current dose rate: ${c.rate.toFixed(2)} mSv/h`,
    `Deterministic AI risk score: ${Math.round(c.ai)} / 100`,
    `Worst rule level: ${LEVEL_NAMES[max]}`,
    `Active rule concerns:\n${active || "  (none)"}`,
    `Recent alerts (most recent first):\n${recentAlerts || "  (none)"}`,
    `Active scenario flags: ${
      c.f.card ? "cardiac strain, " : ""
    }${c.f.sleep ? "sleep debt" : ""}${
      !c.f.card && !c.f.sleep ? "(none)" : ""
    }`,
    `Last-tick values: HR=${Math.round(last(c.H.hr))} SpO2=${last(
      c.H.spo2
    ).toFixed(1)}% stress=${Math.round(last(c.H.stress))} rate=${last(
      c.H.rate
    ).toFixed(2)}`,
  ].join("\n");
}
