"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { colorForLevel } from "@/lib/colors";
import { LEVEL_NAMES } from "@/lib/types";
import type { Crew, Level } from "@/lib/types";

interface CrewListProps {
  crew: Crew[];
  selected: 0 | 1 | 2;
  aiOn: boolean;
  onPick: (i: 0 | 1 | 2) => void;
}

function worstLevel(c: Crew): Level {
  return c.r.reduce((m, v) => (v > m ? v : m), 0) as Level;
}

export function CrewList({ crew, selected, aiOn, onPick }: CrewListProps) {
  return (
    <aside className="flex flex-col gap-2">
      {crew.map((c, i) => {
        const w = worstLevel(c);
        return (
          <motion.button
            key={c.id}
            onClick={() => onPick(i as 0 | 1 | 2)}
            whileHover={{ x: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "relative overflow-hidden rounded-xl border p-3 text-left transition-colors",
              "border-white/10 bg-white/[0.03]",
              selected === i && "border-ink/60"
            )}
            style={
              selected === i
                ? { boxShadow: `inset 4px 0 0 ${colorForLevel(w)}` }
                : undefined
            }
          >
            <div className="flex items-start justify-between">
              <div>
                <b className="block text-sm font-medium text-ink">{c.n}</b>
                <span className="text-[11px] text-white/40">{c.role}</span>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                style={{ background: colorForLevel(w) }}
              >
                {LEVEL_NAMES[w]}
              </span>
            </div>
            <div className="mt-2 font-mono text-[11px] tabular-nums text-white/50">
              {aiOn ? `AI ${Math.round(c.ai)}` : "AI offline"} · HR{" "}
              {Math.round(c.hr)} · SpO₂ {c.spo2.toFixed(0)}
            </div>
          </motion.button>
        );
      })}
    </aside>
  );
}
