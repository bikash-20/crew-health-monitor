"use client";

import { Button } from "./ui/Button";
import { motion, AnimatePresence } from "framer-motion";

interface ScenarioBarProps {
  storm: boolean;
  aiOn: boolean;
  selectedFlags: { sleep: 0 | 1; card: 0 | 1 };
  onToggle: (k: "storm" | "ai" | "sleep" | "card") => void;
  onDemo: () => void;
  onReset: () => void;
  caption: string;
}

export function ScenarioBar({
  storm,
  aiOn,
  selectedFlags,
  onToggle,
  onDemo,
  onReset,
  caption,
}: ScenarioBarProps) {
  return (
    <div className="mx-6 mb-3 mt-3 flex flex-wrap items-center gap-2">
      <Button variant="primary" onClick={onDemo}>
        Run guided demo
      </Button>
      <span className="ml-2 text-sm text-white/40">Inject a problem:</span>
      <Button variant={storm ? "danger" : "default"} onClick={() => onToggle("storm")}>
        Solar storm (all crew)
      </Button>
      <Button
        variant={selectedFlags.sleep ? "danger" : "default"}
        onClick={() => onToggle("sleep")}
      >
        Sleep debt (selected)
      </Button>
      <Button
        variant={selectedFlags.card ? "danger" : "default"}
        onClick={() => onToggle("card")}
      >
        Cardiac strain (selected)
      </Button>
      <Button variant={!aiOn ? "danger" : "default"} onClick={() => onToggle("ai")}>
        AI offline
      </Button>
      <Button onClick={onReset}>Reset</Button>
      <AnimatePresence mode="wait">
        {caption && (
          <motion.p
            key={caption}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="basis-full text-sm font-medium text-accent"
          >
            {caption}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
