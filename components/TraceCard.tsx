"use client";

import { Panel, PanelTitle } from "./ui/Panel";
import { LEVEL_NAMES } from "@/lib/types";
import type { Alert, Crew } from "@/lib/types";

export function TraceCard({
  alert,
  crew,
}: {
  alert: Alert | null;
  crew: Crew[];
}) {
  return (
    <Panel>
      <PanelTitle title="Why did this alert fire?" />
      {!alert ? (
        <p className="text-sm text-white/50">
          Select an alert to see how it was decided.
        </p>
      ) : (
        <ol className="ml-4 list-decimal space-y-1.5 text-sm text-white/80">
          <li>
            <b className="text-ink">Reading.</b> {alert.why}.
          </li>
          <li>
            <b className="text-ink">Rule.</b> {alert.n} threshold: {alert.th}.
            Result: {LEVEL_NAMES[alert.lv]}.
          </li>
          <li>
            <b className="text-ink">AI score at the time.</b>{" "}
            {alert.aiOn
              ? `${alert.ai} of 100, advisory only`
              : "scorer was offline, not needed"}
            .
          </li>
          <li>
            <b className="text-ink">Decision.</b> Made by the rule, not the AI.
          </li>
          <li>
            <b className="text-ink">Action.</b>{" "}
            {alert.lv === 2
              ? "Page the flight surgeon now and start the protocol."
              : "Notify the flight surgeon and re-check in 30 minutes."}
          </li>
        </ol>
      )}
    </Panel>
  );
}
