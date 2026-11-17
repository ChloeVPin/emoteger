import type { ComponentProps } from "react";

type Variant = "sun" | "quiet" | "ghost";
type Size = "md" | "lg";

const base =
  "pressable inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap " +
  "transition-[filter,background-color,color] duration-150 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  sun: "bg-sun text-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.28)] [@media(hover:hover)]:hover:bg-sun-hi",
  quiet: "bg-raised text-fg [@media(hover:hover)]:hover:bg-overlay",
  ghost: "text-fg-2 [@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg",
};

const sizes: Record<Size, string> = {
  md: "h-8 rounded-[8px] px-3 text-[13px]",
  lg: "h-10 rounded-[10px] px-4 text-[14px]",
};

export function buttonClass(variant: Variant = "quiet", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "quiet",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-concentric px-1 font-sans text-[11px] font-medium text-fg-3 shadow-[inset_0_0_0_1px_var(--color-line-strong)]">
      {children}
    </kbd>
  );
}
