"use client";

import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";

type Option<T extends string> = { value: T; label: string; meta?: string };

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
  size?: "sm" | "md";
}) {
  return (
    <SegmentedControl
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next as T);
      }}
      className="relative isolate inline-flex shrink-0 rounded-[8px] bg-raised p-0.5"
    >
      <SegmentedControlIndicator className="pointer-events-none absolute top-(--segmented-control-indicator-top) left-(--segmented-control-indicator-left) z-0 h-(--segmented-control-indicator-height) w-(--segmented-control-indicator-width) rounded-concentric bg-[oklch(0.3_0.005_75)] shadow-[0_1px_2px_oklch(0_0_0/0.35)] transition-[left,top,width,height] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none" />
      {options.map((o) => (
        <SegmentedControlItem
          key={o.value}
          value={o.value}
          className={`relative z-10 flex items-center gap-1 rounded-concentric text-[13px] ${
            size === "sm" ? "h-6 px-2" : "h-7 px-2.5"
          } font-medium whitespace-nowrap text-fg-3 outline-offset-0 transition-colors duration-150 data-checked:text-fg [@media(hover:hover)]:hover:data-unchecked:text-fg-2`}
        >
          {o.label}
          {o.meta ? (
            <span className="tabular text-[12px] font-normal text-fg-3/80 in-data-checked:text-fg-2">{o.meta}</span>
          ) : null}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
