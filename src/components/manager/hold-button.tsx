"use client";

import { useEffect, useRef, useState } from "react";
import { TrashIcon } from "../icons";

const HOLD_MS = 1200;

/** Press and hold to confirm. Slow while deciding, instant on release. */
export function HoldToDelete({
  onConfirm,
  disabled,
  label = "Hold to delete",
  className = "",
}: {
  onConfirm: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const start = () => {
    if (disabled || timer.current) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      navigator.vibrate?.(12);
      onConfirm();
    }, HOLD_MS);
  };

  useEffect(() => cancel, []);

  const content = (
    <>
      <TrashIcon />
      {label}
    </>
  );

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => e.button === 0 && start()}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && (e.preventDefault(), start())}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && cancel()}
      onContextMenu={(e) => e.preventDefault()}
      className={`pressable relative h-8 w-full touch-none overflow-hidden rounded-[8px] text-[13px] font-medium text-danger transition-[transform,background-color] duration-150 disabled:pointer-events-none disabled:text-fg-3 [@media(hover:hover)]:hover:bg-danger/[0.08] ${className}`}
    >
      <span className="flex items-center justify-center gap-2">{content}</span>
      <span
        aria-hidden
        data-on={holding || undefined}
        className="absolute inset-0 flex items-center justify-center gap-2 bg-danger text-white [clip-path:inset(0_100%_0_0)] [transition:clip-path_180ms_var(--ease-out)] data-[on]:[clip-path:inset(0_0_0_0)] data-[on]:[transition:clip-path_1200ms_linear]"
      >
        {content}
      </span>
    </button>
  );
}
