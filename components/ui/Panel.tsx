"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  highlight?: boolean;
  tone?: "default" | "accent";
}

export function Panel({
  children,
  className,
  highlight,
  tone = "default",
  ...rest
}: PanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 backdrop-blur-md",
        "bg-white/[0.03] border-white/10",
        tone === "accent" && "border-accent/40",
        highlight && "ring-2 ring-accent/70",
        className
      )}
      {...(rest as any)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 3px)",
        }}
      />
      {children}
    </motion.div>
  );
}

export function PanelTitle({
  title,
  right,
  tone,
}: {
  title: string;
  right?: ReactNode;
  tone?: "ok" | "accent";
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-white/60">
        <span>{title}</span>
        {tone && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal",
              tone === "ok"
                ? "border-ok/50 text-ok"
                : "border-accent/50 text-accent"
            )}
          >
            {tone === "ok" ? "decides" : "advises only"}
          </span>
        )}
      </h2>
      {right}
    </div>
  );
}
