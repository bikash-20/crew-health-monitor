"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

const STEPS = [
  { label: "Simulate", sub: "" },
  { label: "Baseline", sub: "" },
  { label: "AI score", sub: "advises" },
  { label: "Rules", sub: "decide" },
  { label: "Alert", sub: "" },
  { label: "Brief", sub: "" },
];

interface PipelineProps {
  onStage: (n: number) => void;
  values: string[];
}

export function Pipeline({ onStage, values }: PipelineProps) {
  return (
    <ol className="mx-6 mt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
      {STEPS.map((s, i) => (
        <li key={s.label} className="flex items-center">
          <motion.button
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => onStage(i + 1)}
            className={cn(
              "min-w-[140px] rounded-lg border bg-white/[0.04] p-2.5 text-left",
              "border-white/10 hover:border-white/30"
            )}
            style={{
              borderTopColor:
                s.sub === "decide"
                  ? "#10b981"
                  : s.sub === "advises"
                  ? "#7c5cff"
                  : "rgba(255,255,255,0.4)",
              borderTopWidth: 3,
            }}
          >
            <b className="block text-[13px] font-medium text-ink">
              {i + 1}. {s.label}
            </b>
            <i className="block text-[11px] not-italic text-white/40">
              {s.sub || "\u00a0"}
            </i>
            <small className="mt-1 block truncate font-mono text-[11px] tabular-nums text-white/60">
              {values[i] || "\u00a0"}
            </small>
          </motion.button>
          {i < STEPS.length - 1 && (
            <span className="px-1 text-lg text-white/30">›</span>
          )}
        </li>
      ))}
    </ol>
  );
}
