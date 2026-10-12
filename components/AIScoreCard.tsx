"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Panel, PanelTitle } from "./ui/Panel";
import { ProgressBar } from "./ui/ProgressBar";
import { band } from "@/lib/aiScore";
import { colorForLevel } from "@/lib/colors";
import type { Crew, Level } from "@/lib/types";

interface AIScoreCardProps {
  crew: Crew;
  aiOn: boolean;
}

export function AIScoreCard({ crew, aiOn }: AIScoreCardProps) {
  const score = Math.round(crew.ai);
  const mx = crew.r.reduce((m, v) => (v > m ? v : m), 0) as Level;

  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => Math.round(v).toString());
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(mv, score, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsub = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [score, mv, display]);

  return (
    <Panel tone="accent">
      <PanelTitle title="AI risk score" tone="accent" />
      {aiOn ? (
        <>
          <div className="flex items-baseline gap-2">
            <span
              ref={ref}
              className="font-mono text-5xl font-bold tabular-nums text-accent"
            >
              {score}
            </span>
            <span className="text-sm text-white/50">/ 100 · {band(score)}</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {crew.F.map(([name, val, max]) => (
              <div
                key={name}
                className="grid grid-cols-[80px_1fr] items-center gap-2 text-xs text-white/60"
              >
                <span>{name}</span>
                <ProgressBar
                  value={(val / max) * 100}
                  color="#7c5cff"
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-white/40">
            {mx === 0 && crew.ai >= 45
              ? "The AI sees a combined pattern no single rule caught. It is flagged for review, not raised as an alert."
              : "The score never raises an alert on its own. Rules do that."}
          </p>
        </>
      ) : (
        <p className="text-sm text-white/60">
          <b className="text-bad">Scorer offline.</b> Rules keep running, so
          alerts still fire.
        </p>
      )}
    </Panel>
  );
}
