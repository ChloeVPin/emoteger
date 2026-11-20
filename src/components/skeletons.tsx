"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { usePathname } from "next/navigation";
import { CompassIcon, SmileIcon, StickerIcon } from "./icons";
import type { Section } from "./manager/sections";

/*
  Loading frames for route changes. Each one uses the same boxes, sizes and spacing as the
  page it stands in for, so the swap to real content doesn't shift anything. Only the parts
  that depend on data pulse; everything structural is already in place.
*/

const pulse = "animate-pulse motion-reduce:animate-none bg-raised";

function Block({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return <span aria-hidden className={`block ${pulse} ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined} />;
}

function HeaderFrame() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg [padding-top:env(safe-area-inset-top)]">
      <div className="flex h-12 items-center gap-1.5 px-3 sm:px-4">
        <Link href="/servers" aria-label="All servers" className="pressable grid size-8 shrink-0 place-items-center rounded-[8px]">
          <Logo size={22} />
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          <Block className="size-6 rounded-full" />
        </div>
      </div>
    </header>
  );
}

function TileGrid({ large = false, count = 36 }: { large?: boolean; count?: number }) {
  return (
    <ul
      aria-hidden
      className={`grid gap-1 ${
        large
          ? "grid-cols-[repeat(auto-fill,minmax(104px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(128px,1fr))]"
          : "grid-cols-[repeat(auto-fill,minmax(76px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(88px,1fr))]"
      }`}
    >
      {Array.from({ length: count }, (_, i) => {
        const delay = (i % 7) * 90;
        return (
          <li key={i} className="flex aspect-square flex-col items-center justify-center gap-2 pt-2 pb-1.5">
            <Block delay={delay} className={`rounded-[10px] ${large ? "size-20" : "size-11"}`} />
            <Block delay={delay} className="h-2 w-12 rounded-full" />
          </li>
        );
      })}
    </ul>
  );
}

function PanelFrame({ rows = 2 }: { rows?: number }) {
  return (
    <aside aria-hidden className="hidden min-h-0 border-l border-line lg:block">
      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-center gap-3">
          <Block className="size-8 rounded-[8px]" />
          <Block className="h-3 w-32 rounded-full" />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i}>
              <div className="flex h-6 items-center justify-between">
                <Block className="h-2.5 w-14 rounded-full" />
                <Block className="h-2.5 w-10 rounded-full" />
              </div>
              <Block className="mt-1 h-[3px] w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/** Panel contents only: the sidebar and panel frame live in the layout and stay on screen. */
export function LibrarySkeleton({ section }: { section: Section }) {
  const sticker = section === "sticker";
  const browse = section === "browse";
  const title = sticker ? "Stickers" : browse ? "Browse" : "Emotes";

  return (
    <div role="status" aria-label="Loading" className="contents">
      <div className="sticky top-12 z-20 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-line bg-bg px-3 py-2 lg:static lg:h-11 lg:flex-nowrap lg:py-0 lg:pr-2 lg:pl-4">
        <div className="flex min-w-0 items-center gap-2 pr-1">
          <span aria-hidden className="shrink-0 text-fg-3">
            {sticker ? <StickerIcon /> : browse ? <CompassIcon /> : <SmileIcon />}
          </span>
          <span className="text-[13px] font-semibold">{title}</span>
        </div>
        <div className="flex min-w-0 basis-full items-center gap-1.5 lg:flex-1 lg:basis-auto lg:justify-end">
          {browse ? <Block className="h-7 w-[112px] rounded-[7px]" /> : null}
          {browse ? <Block className="h-7 w-[124px] rounded-[7px]" /> : null}
          <Block className="h-7 min-w-0 flex-1 rounded-[7px] sm:max-w-56 lg:w-52 lg:flex-none" />
          <Block className="h-7 w-[166px] shrink-0 rounded-[7px]" />
          {browse ? null : <Block className="ml-auto h-7 w-[92px] shrink-0 rounded-[7px] lg:ml-0" />}
        </div>
      </div>
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="emote-scroll min-w-0 flex-1 px-2 pt-3 sm:px-3 lg:overflow-y-hidden">
          <TileGrid large={sticker} count={sticker ? 18 : 42} />
        </section>
        <PanelFrame rows={sticker ? 1 : 2} />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function ServersSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <HeaderFrame />
      <main className="mx-auto max-w-[600px] px-4 pt-10 pb-24 sm:pt-16">
        <h1 className="display px-3 text-[20px] font-semibold">Servers</h1>
        <ul aria-hidden className="mt-6 rounded-[18px] bg-surface p-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex h-11 items-center gap-3 rounded-concentric pr-2 pl-1.5">
              <Block delay={i * 90} className="size-8 rounded-concentric" />
              <Block delay={i * 90} className={`h-3 rounded-full ${["w-40", "w-28", "w-52", "w-36"][i]}`} />
            </li>
          ))}
        </ul>
      </main>
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Entering or switching servers: the whole shell is new, so the sidebar waits too. */
function ServerShellSkeleton({ section }: { section: Section }) {
  return (
    <div role="status" aria-label="Loading" className="min-h-dvh bg-base lg:grid lg:h-dvh lg:grid-cols-[232px_minmax(0,1fr)] lg:overflow-hidden">
      <aside aria-hidden className="hidden flex-col gap-2 px-2 pt-2 lg:flex">
        <span className="flex h-8 items-center gap-2 px-1.5">
          <Block className="size-5 rounded-[6px]" />
          <Block className="h-3 w-28 rounded-full" />
        </span>
        <Block className="mt-2 h-7 w-full rounded-[6px] opacity-60" />
        <div className="mt-3 flex flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            <Block key={i} delay={i * 90} className="h-7 w-full rounded-[6px] opacity-60" />
          ))}
        </div>
      </aside>
      <div aria-hidden className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-base px-3 lg:hidden">
        <Block className="size-5 rounded-[6px]" />
        <Block className="h-3 w-32 rounded-full" />
      </div>
      <main className="flex min-w-0 flex-col bg-bg lg:my-2 lg:mr-2 lg:min-h-0 lg:overflow-hidden lg:rounded-[12px] lg:shadow-[0_0_0_1px_var(--color-line),0_1px_3px_oklch(0_0_0/0.3)]">
        <LibrarySkeleton section={section} />
      </main>
    </div>
  );
}

/** One loading boundary for /servers/*: picks the frame that matches where you're going. */
export function ServersLoading() {
  const path = usePathname();
  const match = /^\/servers\/(\d+)(\/stickers|\/browse)?/.exec(path);
  if (!match) return <ServersSkeleton />;
  const section: Section = match[2] === "/stickers" ? "sticker" : match[2] === "/browse" ? "browse" : "emote";
  return <ServerShellSkeleton section={section} />;
}
