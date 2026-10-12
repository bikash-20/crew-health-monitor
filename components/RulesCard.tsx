"use client";

import { Panel, PanelTitle } from "./ui/Panel";
import { colorForLevel } from "@/lib/colors";
import { LEVEL_NAMES } from "@/lib/types";
import type { Crew } from "@/lib/types";

export function RulesCard({ crew }: { crew: Crew }) {
  return (
    <Panel>
      <PanelTitle title="Rules" tone="ok" />
      <table className="w-full text-sm">
        <tbody>
          {crew.R.map((r, i) => (
            <tr
              key={r.n}
              className="border-b border-white/5 last:border-b-0 align-top"
            >
              <td className="py-2 pr-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: colorForLevel(r.lv) }}
                />
              </td>
              <td className="py-2 pr-2">
                <b className="text-ink">{r.n}</b>
                <br />
                <span className="text-[11px] text-white/40">{r.th}</span>
              </td>
              <td className="py-2 text-right">
                <span className="font-mono tabular-nums text-ink">{r.val}</span>
                <br />
                <span
                  className="text-[11px] font-medium"
                  style={{ color: colorForLevel(r.lv) }}
                >
                  {LEVEL_NAMES[r.lv]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
