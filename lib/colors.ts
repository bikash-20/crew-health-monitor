import type { Level } from "./types";

export const LEVEL_COLORS = {
  ok: "#10b981",
  watch: "#f59e0b",
  bad: "#f43f5e",
  accent: "#7c5cff",
  ink: "#e6ecf5",
} as const;

export function colorForLevel(lv: Level): string {
  return lv === 0 ? LEVEL_COLORS.ok : lv === 1 ? LEVEL_COLORS.watch : LEVEL_COLORS.bad;
}
