"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Option<T extends string> = { value: T; label: string; meta?: string };

/**
 * Two identical rows of labels; the top, "active" copy is clipped to the selected option.
 * Animating the clip gives a single continuous highlight with a perfect color handoff.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** "sm" is the 28px control used in panel headers. */
  size?: "sm" | "md";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<T, HTMLButtonElement>());
  const [clip, setClip] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const el = itemRefs.current.get(value);
      const overlay = overlayRef.current;
      if (!el || !overlay) return;
      // Clip coordinates are relative to the overlay, which is inset by the track's padding.
      const box = el.getBoundingClientRect();
      const frame = overlay.getBoundingClientRect();
      const left = box.left - frame.left;
      const right = frame.right - box.right;
      const radius = getComputedStyle(el).borderTopLeftRadius;
      setClip(`inset(0 ${right}px 0 ${left}px round ${radius})`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    const id = requestAnimationFrame(() => setReady(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id);
    };
  }, [value, options]);

  const row = (active: boolean) =>
    options.map((o) => (
      <button
        key={o.value}
        type="button"
        tabIndex={active ? -1 : 0}
        aria-hidden={active || undefined}
        aria-pressed={active ? undefined : o.value === value}
        ref={active ? undefined : (el) => void (el ? itemRefs.current.set(o.value, el) : itemRefs.current.delete(o.value))}
        onClick={active ? undefined : () => onChange(o.value)}
        className={`flex items-center rounded-concentric text-[13px] ${size === "sm" ? "h-6 px-2" : "h-7 px-2.5"} font-medium whitespace-nowrap outline-offset-0 ${
          active ? "text-fg" : "text-fg-3 transition-colors duration-150 [@media(hover:hover)]:hover:text-fg-2"
        }`}
      >
        {o.label}
        {o.meta ? <span className={`tabular text-[12px] font-normal ${active ? "text-fg-2" : "text-fg-3/80"}`}>{o.meta}</span> : null}
      </button>
    ));

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      className="relative flex shrink-0 rounded-[8px] bg-raised p-0.5"
    >
      <div className="flex rounded-concentric">{row(false)}</div>
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0.5 flex rounded-concentric bg-[oklch(0.3_0.005_75)] shadow-[0_1px_2px_oklch(0_0_0/0.35)]"
        style={{
          clipPath: clip ?? "inset(0 100% 0 0)",
          transition: ready ? "clip-path 260ms var(--ease-out)" : "none",
        }}
      >
        {row(true)}
      </div>
    </div>
  );
}
