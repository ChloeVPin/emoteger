"use client";

import { toast } from "@ui-sdk/react/toast";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "../icons";

export function useFlash() {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const flash = () => {
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1400);
  };
  return [done, flash] as const;
}

export function SwapIcon({ done, icon }: { done: boolean; icon: React.ReactNode }) {
  return (
    <span className="relative grid size-4 shrink-0 place-items-center">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={done ? "done" : "idle"}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", bounce: 0, duration: 0.2 }}
          className={`grid place-items-center ${done ? "text-fg" : ""}`}
        >
          {done ? <CheckIcon /> : icon}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export async function copyText(text: string, flash: () => void) {
  try {
    await navigator.clipboard.writeText(text);
    flash();
  } catch {
    toast.error("Couldn't copy");
  }
}

export const quietButton =
  "pressable inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium text-fg " +
  "bg-raised transition-[filter,background-color] duration-150 disabled:opacity-40 data-disabled:opacity-40 " +
  "[@media(hover:hover)]:hover:bg-overlay";
