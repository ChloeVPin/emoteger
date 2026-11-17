import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { BulkStatus } from "./bulk-status";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";

export function AppHeader({
  user,
  children,
  actions,
  below,
}: {
  user: SessionUser;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  below?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg [padding-top:env(safe-area-inset-top)]">
      <div className="flex h-12 items-center gap-1.5 px-3 sm:px-4">
        <Link href="/servers" aria-label="Servers" className="pressable grid size-8 shrink-0 place-items-center rounded-[8px]">
          <Logo size={22} priority />
        </Link>
        {children}
        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          {actions}
          <BulkStatus />
          <UserMenu user={user} />
        </div>
      </div>
      {below}
    </header>
  );
}
