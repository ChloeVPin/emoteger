import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { BulkStatus } from "./bulk-status";
import { Button } from "./button";
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
        <Button
          variant="ghost"
          render={<Link href="/servers" />}
          aria-label="All servers"
          className="!size-8 shrink-0 !p-0"
        >
          <Logo size={22} priority />
        </Button>
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
