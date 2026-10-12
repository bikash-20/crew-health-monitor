export type Level = 0 | 1 | 2; // 0 stable, 1 watch, 2 alert
export const LEVEL_NAMES = ["Stable", "Watch", "Alert"] as const;

export type FactorName =
  | "Heart rate"
  | "Oxygen"
  | "Sleep"
  | "Stress"
  | "Radiation";

export interface VitalsHistory {
  hr: number[];
  spo2: number[];
  stress: number[];
  rate: number[];
}

export interface Crew {
  id: 0 | 1 | 2;
  n: string; // name
  role: string;
  bhr: number; // baseline hr
  hr: number;
  spo2: number;
  sleep: number;
  stress: number;
  dose: number; // 30-day dose mSv
  rate: number; // current mSv/h
  H: VitalsHistory;
  r: Level[]; // last rule levels (5 slots)
  ai: number; // ai score 0..100
  F: [FactorName, number, number][]; // factor contributions
  R: RuleResult[];
  f: { sleep: 0 | 1; card: 0 | 1 };
}

export interface RuleResult {
  n: FactorName;
  th: string;
  val: string;
  lv: Level;
  why: string;
}

export interface Alert {
  id: string;
  t: string; // timestamp string
  i: 0 | 1 | 2; // crew index
  j: number; // rule index
  n: FactorName;
  th: string;
  lv: Level;
  why: string;
  ai: number;
  aiOn: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
}
