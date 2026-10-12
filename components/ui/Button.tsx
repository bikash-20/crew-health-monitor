"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "active" | "danger" | "primary";
}

export function Button({
  children,
  className,
  variant = "default",
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        variant === "default" &&
          "border-white/10 bg-white/5 text-ink hover:bg-white/10",
        variant === "active" && "border-ink bg-ink text-bg",
        variant === "danger" &&
          "border-bad/30 bg-bad/10 text-bad hover:bg-bad/20",
        variant === "primary" &&
          "border-accent bg-accent text-white hover:bg-accent-soft",
        className
      )}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  );
}
