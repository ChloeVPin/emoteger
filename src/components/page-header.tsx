export function PageHeader({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-12 z-20 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-line bg-bg px-3 py-2 lg:static lg:h-11 lg:flex-nowrap lg:py-0 lg:pr-2 lg:pl-4">
      <div className="flex min-w-0 items-center gap-2 pr-1">
        <span aria-hidden className="shrink-0 text-fg-3">
          {icon}
        </span>
        <h1 className="text-[13px] font-semibold">{title}</h1>
        {count !== undefined ? <span className="tabular text-[12px] text-fg-3">{count}</span> : null}
      </div>
      <div className="flex min-w-0 basis-full items-center gap-1.5 lg:flex-1 lg:basis-auto lg:justify-end">{children}</div>
    </div>
  );
}

export const headerButton =
  "pressable inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-[7px] px-2 text-[13px] font-medium text-fg-2 " +
  "transition-[filter,background-color,color] duration-150 data-open:bg-hover data-open:text-fg " +
  "[@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg";
