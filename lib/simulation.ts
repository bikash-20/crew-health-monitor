import type { Alert, Crew } from "./types";
import { aiScore } from "./aiScore";
import { evalRules } from "./rules";

const NAMES = ["Cdr. Amara Okafor", "Dr. Lin Zhao", "Eng. Rafi Ahmed"];
const ROLES = ["Commander", "Flight surgeon", "Engineer"];
const BH = [58, 64, 70];
const D0 = [165, 158, 171];

const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rn = (a: number, b: number) => a + Math.random() * (b - a);

export function mkCrew(i: 0 | 1 | 2): Crew {
  return {
    id: i,
    n: NAMES[i],
    role: ROLES[i],
    bhr: BH[i],
    hr: BH[i],
    spo2: 98,
    sleep: 7.2,
    stress: 28,
    dose: D0[i],
    rate: 0.04,
    H: { hr: [], spo2: [], stress: [], rate: [] },
    r: [0, 0, 0, 0, 0],
    ai: 0,
    F: [],
    R: [],
    f: { sleep: 0, card: 0 },
  };
}

/** Build a fresh 3-person crew, then warm it up with `warmup` ticks so
 *  charts have data on first paint. Used by the page initializer and the
 *  reset action. Single source of truth for the "demo-ready" state. */
export function seedCrew(warmup = 60): Crew[] {
  const crew = ([0, 1, 2] as const).map((i) => mkCrew(i));
  for (let i = 0; i < warmup; i++) {
    step(crew, {
      storm: false,
      aiOn: true,
      emitAlerts: false,
      tick: 0,
    });
  }
  return crew;
}

/** Mission clock. Starts at Day 112, 06:00. */
export function clock(tick: number): string {
  const m = tick * 30 + 360;
  const h = Math.floor((m % 1440) / 60);
  const mi = m % 60;
  return (
    "Day " +
    (112 + Math.floor(m / 1440)) +
    " · " +
    String(h).padStart(2, "0") +
    ":" +
    String(mi).padStart(2, "0")
  );
}

export interface StepOpts {
  storm: boolean;
  aiOn: boolean;
  emitAlerts: boolean;
  tick: number;
  onAlert?: (a: Alert) => void;
}

/** Advance one tick for the whole crew. Mutates crew in place. */
export function step(crew: Crew[], opts: StepOpts): void {
  const { storm, aiOn, emitAlerts, tick, onAlert } = opts;

  crew.forEach((c, i) => {
    const f = c.f;
    c.stress = cl(
      c.stress +
        (28 +
          f.sleep * 34 +
          f.card * 28 +
          (storm ? 18 : 0) -
          c.stress) *
          0.12 +
        rn(-2, 2),
      0,
      100
    );
    c.hr +=
      (c.bhr * (1 + 0.6 * f.card) + (c.stress - 30) * 0.12 - c.hr) * 0.25 +
      rn(-1.2, 1.2);
    c.spo2 = Math.min(
      100,
      c.spo2 + ((f.card ? 93.2 : 98) - c.spo2) * 0.2 + rn(-0.3, 0.3)
    );
    c.sleep += ((f.sleep ? 3.8 : 7.2) - c.sleep) * 0.07 + rn(-0.03, 0.03);
    c.rate = storm ? 3 + rn(-0.4, 0.6) : 0.04 + rn(0, 0.02);
    c.dose += c.rate * 0.5;

    const H = c.H;
    H.hr.push(c.hr);
    H.spo2.push(c.spo2);
    H.stress.push(c.stress);
    H.rate.push(c.rate);
    for (const k in H) if (H[k as keyof typeof H].length > 60) (H[k as keyof typeof H] as number[]).shift();

    aiScore(c);
    const R = evalRules(c);
    R.forEach((x, j) => {
      if (emitAlerts && x.lv > c.r[j]) {
        const a: Alert = {
          id: `${tick}-${i}-${j}`,
          t: clock(tick),
          i: i as 0 | 1 | 2,
          j,
          n: x.n,
          th: x.th,
          lv: x.lv,
          why: x.why,
          ai: Math.round(c.ai),
          aiOn,
        };
        onAlert?.(a);
      }
      c.r[j] = x.lv;
    });
    c.R = R;
  });
}
