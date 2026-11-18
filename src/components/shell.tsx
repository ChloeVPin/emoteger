"use client";

import { Drawer, DrawerBackdrop, DrawerContent, DrawerTitle, DrawerTrigger, createDrawerController } from "@ui-sdk/react/drawer";
import { useShortcutHint } from "@ui-sdk/react/shortcuts";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/session";
import type { GuildDetail, GuildSummary } from "@/lib/types";
import { GuildIcon, UserAvatar } from "./avatar";
import { BulkDialog, BulkIndicator } from "./bulk-status";
import { Button, Kbd } from "./button";
import { CommandMenu, commandMenu } from "./command-menu";
import {
  CheckIcon,
  ChevronsIcon,
  CompassIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  ServersIcon,
  SmileIcon,
  StickerIcon,
} from "./icons";
import { type Section, sectionPath, useSection } from "./manager/sections";
import { useMediaQuery } from "./manager/use-media-query";
import { Menu, MenuContent, MenuItem, MenuItemIcon, MenuSeparator, MenuTrigger, itemClass, popupClass } from "./menu";

type Shell = { user: SessionUser; guild: Pick<GuildDetail, "id" | "name" | "icon">; guilds: GuildSummary[] };

const NAV: { section: Section; label: string; icon: React.ReactNode }[] = [
  { section: "emote", label: "Emotes", icon: <SmileIcon /> },
  { section: "sticker", label: "Stickers", icon: <StickerIcon /> },
  { section: "browse", label: "Browse", icon: <CompassIcon /> },
];

const row =
  "pressable flex h-7 w-full min-w-0 items-center justify-start gap-2 rounded-[6px] px-2 text-[13px] font-medium transition-[filter,background-color,color] duration-150";

function ServerMenu({ guild, guilds }: Pick<Shell, "guild" | "guilds">) {
  const section = useSection();
  return (
    <Menu>
      <MenuTrigger
        aria-label={`Switch server, ${guild.name}`}
        className="pressable flex h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-1.5 text-left transition-[filter,background-color] duration-150 data-open:bg-hover [@media(hover:hover)]:hover:bg-hover"
      >
        <GuildIcon guild={guild} size={20} concentric />
        <span dir="auto" title={guild.name} className="min-w-0 flex-1 truncate text-[13px] font-semibold">
          {guild.name}
        </span>
        <ChevronsIcon size={12} className="shrink-0 text-fg-3" />
      </MenuTrigger>
      <MenuContent sideOffset={4} align="start" className={`${popupClass} max-h-[min(420px,var(--available-height))] w-64 overflow-y-auto`}>
        {guilds.map((g) => (
          <MenuItem
            key={g.id}
            value={g.id}
            label={g.name}
            render={<Link href={`/servers/${g.id}${sectionPath(section)}`} />}
            className={itemClass}
          >
            <GuildIcon guild={g} size={18} concentric />
            <span dir="auto" className="min-w-0 flex-1 truncate">
              {g.name}
            </span>
            {g.id === guild.id ? <CheckIcon size={14} className="text-fg-2" /> : null}
          </MenuItem>
        ))}
        <MenuSeparator className="-mx-1 my-1 h-px bg-line" />
        <MenuItem value="all-servers" label="All servers" render={<Link href="/servers" />} className={`${itemClass} text-fg-2`}>
          <MenuItemIcon className="text-fg-3">
            <ServersIcon />
          </MenuItemIcon>
          All servers
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function AccountMenu({ user }: Pick<Shell, "user">) {
  const name = user.globalName ?? user.username;
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={formRef} action="/api/auth/logout" method="post" hidden />
      <Menu onAction={(value) => value === "sign-out" && formRef.current?.requestSubmit()}>
        <MenuTrigger
          aria-label={`Account, ${name}`}
          className={`${row} text-fg-2 data-open:bg-hover [@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg`}
        >
          <UserAvatar user={user} size={18} />
          <span className="min-w-0 flex-1 truncate text-left">{name}</span>
        </MenuTrigger>
        <MenuContent side="top" sideOffset={4} align="start" className={`${popupClass} w-56`}>
          <div className="px-2 pt-1.5 pb-2">
            <div className="truncate font-medium">{name}</div>
            <div className="truncate text-[12px] text-fg-3">@{user.username}</div>
          </div>
          <MenuSeparator className="-mx-1 my-1 h-px bg-line" />
          <MenuItem value="sign-out" className={itemClass}>
            <MenuItemIcon className="text-fg-3">
              <LogOutIcon />
            </MenuItemIcon>
            Sign out
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}

function Sidebar({ user, guild, guilds, onNavigate }: Shell & { onNavigate?: () => void }) {
  const section = useSection();
  const others = guilds.filter((g) => g.id !== guild.id).slice(0, 8);
  const hint = useShortcutHint("mod+k");

  return (
    <div className="flex h-full min-h-0 flex-col px-2 pt-2 pb-2">
      <ServerMenu guild={guild} guilds={guilds} />

      <Button
        variant="ghost"
        aria-keyshortcuts={hint.ariaKeyshortcuts}
        onClick={() => {
          onNavigate?.();
          commandMenu.open();
        }}
        className={`${row} mt-2 !h-7 !px-2 text-fg-3 [@media(hover:hover)]:hover:text-fg-2`}
      >
        <SearchIcon className="shrink-0" />
        <span className="flex-1 text-left font-normal">Command menu</span>
        <Kbd>{hint.text || "⌘K"}</Kbd>
      </Button>

      <nav aria-label="Library" className="mt-3 flex flex-col gap-px">
        {NAV.map((n) => {
          const active = n.section === section;
          return (
            <Button
              key={n.section}
              variant="ghost"
              render={<Link href={`/servers/${guild.id}${sectionPath(n.section)}`} />}
              onClick={() => onNavigate?.()}
              aria-current={active ? "page" : undefined}
              className={`${row} !h-7 !px-2 ${active ? "bg-hover !text-fg" : ""}`}
            >
              <span aria-hidden="true" className={`shrink-0 ${active ? "text-fg-2" : "text-fg-3"}`}>
                {n.icon}
              </span>
              {n.label}
            </Button>
          );
        })}
      </nav>

      {others.length ? (
        <div className="mt-6 min-h-0 overflow-y-auto [scrollbar-width:none]">
          <div className="flex h-6 items-center px-2 text-[12px] font-medium text-fg-3">Servers</div>
          <div className="mt-0.5 flex flex-col gap-px">
            {others.map((g) => (
              <Button
                key={g.id}
                variant="ghost"
                render={<Link href={`/servers/${g.id}${sectionPath(section)}`} />}
                onClick={() => onNavigate?.()}
                className={`${row} !h-7 !px-2 font-normal`}
              >
                <GuildIcon guild={g} size={16} concentric />
                <span dir="auto" className="min-w-0 flex-1 truncate text-left">
                  {g.name}
                </span>
              </Button>
            ))}
            <Button
              variant="ghost"
              render={<Link href="/servers" />}
              onClick={() => onNavigate?.()}
              className={`${row} !h-7 !px-2 font-normal !text-fg-3 [@media(hover:hover)]:hover:!text-fg-2`}
            >
              <ServersIcon className="shrink-0" />
              All servers
            </Button>
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

function MobileBar({ hidden, ...props }: Shell & { hidden: boolean }) {
  const [drawer] = useState(createDrawerController);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    drawer.close();
  }, [path, drawer]);

  return (
    <Drawer side="left" controller={drawer} open={open} onOpenChange={setOpen}>
      <div
        data-agent-hidden={hidden ? "" : undefined}
        className="sticky top-0 z-30 flex h-12 items-center gap-1 border-b border-line bg-base px-2 [padding-top:env(safe-area-inset-top)] lg:hidden"
      >
        <DrawerTrigger
          aria-label="Open navigation"
          className="pressable grid size-8 place-items-center rounded-[8px] text-fg-2 [@media(hover:hover)]:hover:bg-hover"
        >
          <MenuIcon />
        </DrawerTrigger>
        <span className="flex min-w-0 flex-1 items-center gap-2 px-1">
          <GuildIcon guild={props.guild} size={18} />
          <span dir="auto" className="truncate text-[13px] font-semibold">
            {props.guild.name}
          </span>
        </span>
        <BulkIndicator />
        <Button
          variant="ghost"
          aria-label="Command menu"
          onClick={() => commandMenu.open()}
          className="!size-8 !p-0"
        >
          <SearchIcon />
        </Button>
      </div>

      <DrawerBackdrop className="fixed inset-0 z-50 m-0 border-0 bg-black/50 p-0 lg:hidden" />
      <DrawerContent className="relative z-50 h-full w-[280px] max-w-[85vw] bg-base pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-(--shadow-float) outline-none lg:hidden">
        <DrawerTitle className="sr-only">Navigation</DrawerTitle>
        <Sidebar {...props} onNavigate={() => drawer.close()} />
      </DrawerContent>
    </Drawer>
  );
}

export function ServerShell({ children, ...props }: Shell & { children: React.ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  return (
    <div className="min-h-dvh bg-base lg:grid lg:h-dvh lg:grid-cols-[232px_minmax(0,1fr)] lg:overflow-hidden">
      <aside
        aria-label="Sidebar"
        data-agent-hidden={!isDesktop ? "" : undefined}
        className="hidden min-h-0 lg:block"
      >
        <Sidebar {...props} />
      </aside>
      <MobileBar {...props} hidden={isDesktop} />
      <main className="flex min-w-0 flex-col bg-bg lg:my-2 lg:mr-2 lg:min-h-0 lg:overflow-hidden lg:rounded-[12px] lg:shadow-[0_0_0_1px_var(--color-line),0_1px_3px_oklch(0_0_0/0.3)]">
        {children}
      </main>
      <CommandMenu guildId={props.guild.id} guilds={props.guilds} />
      <BulkDialog />
    </div>
  );
}
