"use client";

import { Panel, PanelTitle } from "./ui/Panel";
import { Sparkline } from "./ui/Sparkline";
import { ProgressBar } from "./ui/ProgressBar";
import { colorForLevel } from "@/lib/colors";
import { LEVEL_COLORS } from "@/lib/colors";
import type { Crew } from "@/lib/types";

interface VitalsCardProps {
  crew: Crew;
}

export function VitalsCard({ crew }: VitalsCardProps) {
  // crew.R is populated after the first simulation step. Until then, fall
  // back to the "ok" color so the tile isn't blank on first paint.
  const col = (i: number): string =>
    crew.R[i] ? colorForLevel(crew.R[i].lv) : LEVEL_COLORS.ok;

  return (
    <Panel>
      <PanelTitle title={`${crew.n} · live vitals`} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Tile
          label="Heart rate"
          big={Math.round(crew.hr)}
          unit="bpm"
          sub={`baseline ${crew.bhr} bpm · dashed = alert threshold`}
        >
          <Sparkline
            data={crew.H.hr}
            threshold={crew.bhr * 1.3}
            color={col(0)}
            yMin={crew.bhr * 0.8}
            yMax={crew.bhr * 1.9}
          />
        </Tile>
        <Tile
          label="Blood oxygen"
          big={crew.spo2.toFixed(1)}
          unit="%"
          sub="watch < 94%"
        >
          <Sparkline
            data={crew.H.spo2}
            threshold={94}
            color={col(1)}
            yMin={88}
            yMax={100}
          />
        </Tile>
        <Tile
          label="Sleep · 3-night avg"
          big={crew.sleep.toFixed(1)}
          unit="h"
          sub="watch < 5.5 h"
        >
          <ProgressBar
            value={(crew.sleep / 9) * 100}
            color={col(2)}
            marks={[61, 50]}
          />
        </Tile>
        <Tile
          label="Stress index"
          big={Math.round(crew.stress)}
          unit="/ 100"
          sub="watch > 75"
        >
          <Sparkline
            data={crew.H.stress}
            threshold={75}
            color={col(3)}
            yMin={0}
            yMax={100}
          />
        </Tile>
        <Tile
          label="Radiation · 30-day"
          big={crew.dose.toFixed(0)}
          unit="/ 250 mSv"
          sub={`rate ${crew.rate.toFixed(2)} mSv/h · marks 80/95%`}
        >
          <ProgressBar
            value={crew.dose / 2.5}
            color={col(4)}
            marks={[80, 95]}
          />
          <div className="mt-2">
            <Sparkline
              data={crew.H.rate}
              threshold={1}
              color={col(4)}
              yMin={0}
              yMax={4}
              height={32}
            />
          </div>
        </Tile>
      </div>
    </Panel>
  );
}

function Tile({
  label,
  big,
  unit,
  sub,
  children,
}: {
  label: string;
  big: string | number;
  unit: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-ink">
        {big}
        <span className="ml-1 text-xs font-normal text-white/50">{unit}</span>
      </div>
      {children}
      <div className="mt-1 text-[11px] text-white/40">{sub}</div>
    </div>
  );
}
