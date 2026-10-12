"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Panel, PanelTitle } from "./ui/Panel";
import { colorForLevel } from "@/lib/colors";
import { LEVEL_NAMES } from "@/lib/types";
import type { Alert, Crew } from "@/lib/types";

interface AlertsCardProps {
  alerts: Alert[];
  crew: Crew[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

function active(a: Alert, crew: Crew[]) {
  return crew[a.i].r[a.j] >= a.lv;
}

export function AlertsCard({ alerts, crew, selected, onSelect }: AlertsCardProps) {
  return (
    <Panel>
      <PanelTitle title="Alerts" tone="ok" />
      {alerts.length === 0 ? (
        <p className="text-sm text-white/50">
          No alerts yet. Inject a problem above and watch one fire.
        </p>
      ) : (
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {alerts.slice(0, 8).map((a) => {
              const isSel = a.id === selected;
              const isActive = active(a, crew);
              return (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => onSelect(isSel ? null : a.id)}
                    className={`block w-full rounded-md border bg-white/[0.02] p-2.5 text-left text-sm transition-colors ${
                      isSel
                        ? "bg-white/[0.08]"
                        : "hover:bg-white/[0.05]"
                    }`}
                    style={{ borderLeft: `4px solid ${colorForLevel(a.lv)}` }}
                  >
                    <b className="text-ink">{crew[a.i].n}</b>: {a.why}
                    <span className="mt-0.5 block text-[11px] text-white/40">
                      {a.t} · {LEVEL_NAMES[a.lv]} ·{" "}
                      {isActive ? "active" : "cleared"}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}
