"use client";

import { Menu } from "@base-ui/react/menu";

export const popupClass =
  "origin-[var(--transform-origin)] min-w-52 rounded-[12px] bg-overlay p-1 text-[13px] text-fg outline-none shadow-(--shadow-float) " +
  "transition-[transform,opacity] duration-150 ease-[var(--ease-out)] " +
  "data-starting-style:scale-[0.97] data-starting-style:opacity-0 " +
  "data-ending-style:opacity-0 data-ending-style:duration-100";

export const itemClass =
  "flex h-8 cursor-default items-center gap-2 rounded-concentric px-2 outline-none select-none " +
  "data-highlighted:bg-hover data-disabled:opacity-50";

export { Menu };
