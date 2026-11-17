"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { avatarUrl } from "@/lib/cdn";
import type { SessionUser } from "@/lib/session";
import type { GuildDetail, GuildSummary } from "@/lib/types";
import { GuildIcon } from "./avatar";
import { BulkDialog, BulkIndicator } from "./bulk-status";
import { Kbd } from "./button";
import { CommandMenu, commandMenu } from "./command-menu";
import { CheckIcon, ChevronsIcon, CompassIcon, LogOutIcon, MenuIcon, SearchIcon, ServersIcon, SmileIcon, StickerIcon } from "./icons";
import { type Section, sectionPath, useSection } from "./manager/sections";
import { Menu, itemClass, popupClass } from "./menu";

type Shell = { user: SessionUser; guild: Pick<GuildDetail, "id" | "name" | "icon">; guilds: GuildSummary[] };

const NAV: { section: Section; label: string; icon: React.ReactNode }[] = [
  { section: "emote", label: "Emotes", icon: <SmileIcon /> },
  { section: "sticker", label: "Stickers", icon: <StickerIcon /> },
  { section: "browse", label: "Browse", icon: <CompassIcon /> },
];

const row =
  "pressable flex h-7 w-full min-w-0 items-center gap-2 rounded-[6px] px-2 text-[13px] font-medium transition-[filter,background-color,color] duration-150";

function ServerMenu({ guild, guilds }: Pick<Shell, "guild" | "guilds">) {
  const section = useSection();
  return (
    <Menu.Root>
      <Menu.Trigger className="pressable flex h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-1.5 text-left transition-[filter,background-color] duration-150 data-popup-open:bg-hover [@media(hover:hover)]:hover:bg-hover">
        <GuildIcon guild={guild} size={20} concentric />
        <span dir="auto" title={guild.name} className="min-w-0 flex-1 truncate text-[13px] font-semibold">
          {guild.name}
        </span>
        <ChevronsIcon size={12} className="shrink-0 text-fg-3" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="start" className="z-50">
          <Menu.Popup className={`${popupClass} max-h-[min(420px,var(--available-height))] w-64 overflow-y-auto`}>
            {guilds.map((g) => (
              <Menu.LinkItem key={g.id} closeOnClick render={<Link href={`/servers/${g.id}${sectionPath(section)}`} />} className={itemClass}>
                <GuildIcon guild={g} size={18} concentric />
                <span dir="auto" className="min-w-0 flex-1 truncate">
                  {g.name}
                </span>
                {g.id === guild.id ? <CheckIcon size={14} className="text-fg-2" /> : null}
              </Menu.LinkItem>
            ))}
            <Menu.Separator className="-mx-1 my-1 h-px bg-line" />
            <Menu.LinkItem closeOnClick render={<Link href="/servers" />} className={`${itemClass} text-fg-2`}>
              <ServersIcon className="text-fg-3" />
              All servers
            </Menu.LinkItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function AccountMenu({ user }: Pick<Shell, "user">) {
  const name = user.globalName ?? user.username;
  return (
    <Menu.Root>
      <Menu.Trigger className={`${row} text-fg-2 data-popup-open:bg-hover [@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg`}>
        <img src={avatarUrl(user)} alt="" width={18} height={18} className="size-[18px] shrink-0 rounded-full" draggable={false} />
        <span className="min-w-0 flex-1 truncate text-left">{name}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="top" sideOffset={4} align="start" className="z-50">
          <Menu.Popup className={`${popupClass} w-56`}>
            <div className="px-2 pt-1.5 pb-2">
              <div className="truncate font-medium">{name}</div>
              <div className="truncate text-[12px] text-fg-3">@{user.username}</div>
            </div>
            <Menu.Separator className="-mx-1 my-1 h-px bg-line" />
            <form action="/api/auth/logout" method="post" className="rounded-concentric">
              <Menu.Item closeOnClick={false} nativeButton render={<button type="submit" className={`${itemClass} w-full text-left`} />}>
                <LogOutIcon className="text-fg-3" />
                Sign out
              </Menu.Item>
            </form>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Sidebar({ user, guild, guilds, onNavigate }: Shell & { onNavigate?: () => void }) {
  const section = useSection();
  const others = guilds.filter((g) => g.id !== guild.id).slice(0, 8);

  return (
    <div className="flex h-full min-h-0 flex-col px-2 pt-2 pb-2">
      <ServerMenu guild={guild} guilds={guilds} />

      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          commandMenu.open();
        }}
        className={`${row} mt-2 text-fg-3 [@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg-2`}
      >
        <SearchIcon className="shrink-0" />
        <span className="flex-1 text-left font-normal">Search</span>
        <Kbd>⌘K</Kbd>
      </button>

      <nav aria-label="Library" className="mt-3 flex flex-col gap-px">
        {NAV.map((n) => {
          const active = n.section === section;
          return (
            <Link
              key={n.section}
              href={`/servers/${guild.id}${sectionPath(n.section)}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`${row} ${
                active ? "bg-hover text-fg" : "text-fg-2 [@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg"
              }`}
            >
              <span className={`shrink-0 ${active ? "text-fg-2" : "text-fg-3"}`}>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      {others.length ? (
        <div className="mt-6 min-h-0 overflow-y-auto [scrollbar-width:none]">
          <div className="flex h-6 items-center px-2 text-[12px] font-medium text-fg-3">Servers</div>
          <div className="mt-0.5 flex flex-col gap-px">
            {others.map((g) => (
              <Link
                key={g.id}
                href={`/servers/${g.id}${sectionPath(section)}`}
                onClick={onNavigate}
                className={`${row} font-normal text-fg-2 [@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg`}
              >
                <GuildIcon guild={g} size={16} concentric />
                <span dir="auto" className="min-w-0 flex-1 truncate">
                  {g.name}
                </span>
              </Link>
            ))}
            <Link
              href="/servers"
              onClick={onNavigate}
              className={`${row} font-normal text-fg-3 [@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg-2`}
            >
              <ServersIcon className="shrink-0" />
              All servers
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-1 pt-3">
        <BulkIndicator variant="row" />
        <AccountMenu user={user} />
      </div>
    </div>
  );
}

function MobileBar(props: Shell) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  // Close the drawer once a navigation lands.
  useEffect(() => setOpen(false), [path]);

  return (
    <>
      <div className="sticky top-0 z-30 flex h-12 items-center gap-1 border-b border-line bg-base px-2 [padding-top:env(safe-area-inset-top)] lg:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="pressable grid size-8 place-items-center rounded-[8px] text-fg-2 [@media(hover:hover)]:hover:bg-hover"
        >
          <MenuIcon />
        </button>
        <span className="flex min-w-0 flex-1 items-center gap-2 px-1">
          <GuildIcon guild={props.guild} size={18} />
          <span dir="auto" className="truncate text-[13px] font-semibold">
            {props.guild.name}
          </span>
        </span>
        <BulkIndicator />
        <button
          type="button"
          aria-label="Search"
          onClick={() => commandMenu.open()}
          className="pressable grid size-8 place-items-center rounded-[8px] text-fg-2 [@media(hover:hover)]:hover:bg-hover"
        >
          <SearchIcon />
        </button>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 lg:hidden" />
          <Dialog.Popup
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-base pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-(--shadow-float) outline-none transition-transform duration-300 ease-[var(--ease-drawer)] data-ending-style:-translate-x-full data-ending-style:duration-200 data-starting-style:-translate-x-full lg:hidden"
          >
            <Sidebar {...props} onNavigate={() => setOpen(false)} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/**
 * Sidebar on the base layer, page content in a rounded panel. Rendered by the server layout,
 * so it stays mounted while pages change inside the panel.
 */
export function ServerShell({ children, ...props }: Shell & { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-base lg:grid lg:h-dvh lg:grid-cols-[232px_minmax(0,1fr)] lg:overflow-hidden">
      <aside aria-label="Sidebar" className="hidden min-h-0 lg:block">
        <Sidebar {...props} />
      </aside>
      <MobileBar {...props} />
      <main className="flex min-w-0 flex-col bg-bg lg:my-2 lg:mr-2 lg:min-h-0 lg:overflow-hidden lg:rounded-[12px] lg:shadow-[0_0_0_1px_var(--color-line),0_1px_3px_oklch(0_0_0/0.3)]">
        {children}
      </main>
      <CommandMenu guildId={props.guild.id} guilds={props.guilds} />
      <BulkDialog />
    </div>
  );
}
