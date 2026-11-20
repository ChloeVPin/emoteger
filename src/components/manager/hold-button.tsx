"use client";

import { bindHold } from "@ui-sdk/core";
import { useEffect, useRef } from "react";
import { Button } from "../button";
import { TrashIcon } from "../icons";

const HOLD_MS = 1200;

export function HoldToDelete({
  onConfirm,
  disabled,
  label = "Hold to delete",
  confirm = "Deletes this item",
  className = "",
}: {
  onConfirm: () => void;
  disabled?: boolean;
  label?: string;
  confirm?: string;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef(onConfirm);
  useEffect(() => {
    confirmRef.current = onConfirm;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;
    return bindHold(el, {
      delay: HOLD_MS,
      onHold: () => {
        navigator.vibrate?.(12);
        confirmRef.current();
      },
    });
  }, [disabled]);

  const content = (
    <>
      <TrashIcon />
      {label}
    </>
  );

  return (
    <Button
      ref={ref}
      variant="ghost"
      disabled={disabled}
      data-agent-confirm={confirm}
      onClick={(_, { source }) => {
        if (source === "agent") confirmRef.current();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`group relative !h-8 w-full touch-none overflow-hidden !rounded-[8px] !px-3 !text-danger disabled:!text-fg-3 data-disabled:!text-fg-3 [@media(hover:hover)]:hover:!bg-danger/[0.08] ${className}`}
    >
      <span className="flex items-center justify-center gap-2">{content}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-danger text-white [clip-path:inset(0_100%_0_0)] [transition:clip-path_180ms_var(--ease-out)] group-data-holding:[clip-path:inset(0_0_0_0)] group-data-holding:[transition:clip-path_var(--hold-delay,1200ms)_linear]"
      >
        {content}
      </span>
    </Button>
  );
}
