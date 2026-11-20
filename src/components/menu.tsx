"use client";

import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemIcon,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@ui-sdk/react/menu";

export const popupClass =
  "z-50 m-0 min-w-52 origin-(--transform-origin) rounded-[12px] border-0 bg-overlay p-1 text-[13px] text-fg shadow-(--shadow-float) outline-none " +
  "transition-[transform,opacity] duration-150 ease-[var(--ease-out)] motion-reduce:transition-none " +
  "data-starting-style:scale-[0.97] data-starting-style:opacity-0 " +
  "data-ending-style:opacity-0 data-ending-style:duration-100";

export const itemClass =
  "flex h-8 cursor-default items-center gap-2 rounded-concentric px-2 outline-none select-none " +
  "data-highlighted:bg-hover data-disabled:opacity-50";

export {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemIcon,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
};
