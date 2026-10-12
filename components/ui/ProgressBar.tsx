"use client";

import { cn } from "@/lib/cn";

interface ProgressBarProps {
  /** 0..100 percent */
  value: number;
  color: string;
  marks?: number[]; // tick positions in percent
  height?: number;
  className?: string;
}

export function ProgressBar({
  value,
  color,
  marks = [],
  height = 8,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-white/10",
        className
      )}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, background: color }}
      />
      {marks.map((m, i) => (
        <div
          key={i}
          className="absolute top-0 h-full w-[2px] bg-white/60"
          style={{ left: `${m}%` }}
        />
      ))}
    </div>
  );
}
