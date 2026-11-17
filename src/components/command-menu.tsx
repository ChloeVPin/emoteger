"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { GuildSummary } from "@/lib/types";
import { GuildIcon } from "./avatar";
import { CheckIcon, CloseIcon, CompassIcon, LogOutIcon, PlusIcon, SearchIcon, ServersIcon, SmileIcon, StickerIcon, TrashIcon } from "./icons";
import { type Section, sectionPath, useSection } from "./manager/sections";

/** One result in a scoped search: an emote, a sticker, a catalog item. */
export type ScopeResult = {
  id: string;
  label: string;
  detail?: string;
  image?: string;
  selected?: boolean;
};

/**
 * A page hands the menu a scope ("Search emoji.gg") and keeps ownership of its data:
 * the menu asks the scope for results and tells it what was picked.
 */
export type SearchScope = {
  label: string;
  initial?: string;
  search: (query: string, signal: AbortSignal) => Promise<ScopeResult[]> | ScopeResult[];
  /** Return true to keep the menu open (multi-select, like adding to a Browse selection). */
  pick: (id: string) => boolean | void;
  /** Live selection state, for checkmarks that update as you pick. */
  isSelected?: (id: string) => boolean;
  /** "Show all results" applies the query to the page itself. */
  showAll?: (query: string) => void;
};

let state: { open: boolean; scope: SearchScope | null } = { open: false, scope: null };
const listeners = new Set<() => void>();
const set = (next: Partial<typeof state>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
export const commandMenu = {
  open: (scope: SearchScope | null = null) => set({ open: true, scope }),
  close: () => set({ open: false }),
};
const useMenu = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => void listeners.delete(l)),
    () => state,
    () => state,
  );

/** Actions a page listens for: the command menu asks, the page that owns the state acts. */
export type PageCommand = "upload" | "delete-all";
export const PAGE_COMMAND = "emoteger:command";

type Row = {
  id: string;
  group: string;
  label: string;
  icon?: React.ReactNode;
  image?: string;
  detail?: string;
  keywords?: string;
  hint?: string;
  selected?: boolean;
  run: () => boolean | void;
};

export function CommandMenu({ guildId, guilds }: { guildId: string; guilds: GuildSummary[] }) {
  const { open, scope } = useMenu();
  const router = useRouter();
  const section = useSection();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<{ query: string; items: ScopeResult[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (state.open) set({ open: false });
        else set({ open: true, scope: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Each time the menu opens, start from the scope's current search (if any).
  useEffect(() => {
    if (open) setQuery(scope?.initial ?? "");
    else setFound(null);
  }, [open, scope]);

  // Scoped searches may hit the network: debounce lightly and cancel stale requests.
  useEffect(() => {
    if (!open || !scope) return;
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      setSearching(true);
      try {
        const items = await scope.search(query.trim(), controller.signal);
        if (!controller.signal.aborted) setFound({ query, items });
      } catch {
        if (!controller.signal.aborted) setFound({ query, items: [] });
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 160);
    return () => {
      controller.abort();
      window.clearTimeout(id);
    };
  }, [open, scope, query]);

  const commands = useMemo<Row[]>(() => {
    const go = (s: Section, id = guildId) => () => router.push(`/servers/${id}${sectionPath(s)}`);
    const page = (cmd: PageCommand) => () => void window.dispatchEvent(new CustomEvent(PAGE_COMMAND, { detail: cmd }));
    const noun = section === "sticker" ? "stickers" : "emotes";
    const list: Row[] = [];
    if (section !== "browse") {
      list.push(
        { id: "upload", group: "Actions", label: `Upload ${noun}`, icon: <PlusIcon />, keywords: "add new file", run: page("upload") },
        { id: "delete-all", group: "Actions", label: `Delete all ${noun}…`, icon: <TrashIcon />, keywords: "remove clear", run: page("delete-all") },
      );
    }
    list.push(
      { id: "go-emote", group: "Go to", label: "Emotes", icon: <SmileIcon />, hint: section === "emote" ? "Current" : undefined, run: go("emote") },
      { id: "go-sticker", group: "Go to", label: "Stickers", icon: <StickerIcon />, hint: section === "sticker" ? "Current" : undefined, run: go("sticker") },
      { id: "go-browse", group: "Go to", label: "Browse", icon: <CompassIcon />, keywords: "emoji.gg 7tv noto fluent import find", hint: section === "browse" ? "Current" : undefined, run: go("browse") },
      ...guilds
        .filter((g) => g.id !== guildId)
        .map((g) => ({ id: `server-${g.id}`, group: "Servers", label: g.name, icon: <GuildIcon guild={g} size={16} />, keywords: "switch server", run: go(section, g.id) })),
      { id: "all-servers", group: "Servers", label: "All servers", icon: <ServersIcon />, run: () => router.push("/servers") },
      {
        id: "sign-out",
        group: "Account",
        label: "Sign out",
        icon: <LogOutIcon />,
        keywords: "log out",
        run: () => {
          const form = Object.assign(document.createElement("form"), { method: "post", action: "/api/auth/logout" });
          document.body.appendChild(form);
          form.submit();
        },
      },
    );
    return list;
  }, [guildId, guilds, router, section]);

  const rows = useMemo<Row[]>(() => {
    if (scope) {
      const q = query.trim();
      const items: Row[] = (found?.items ?? []).map((r) => ({
        id: `scope-${r.id}`,
        group: "Results",
        label: r.label,
        detail: r.detail,
        image: r.image,
        selected: scope.isSelected?.(r.id) ?? r.selected,
        run: () => scope.pick(r.id),
      }));
      if (q && scope.showAll) {
        items.push({ id: "show-all", group: "", label: `Show all results for “${q}”`, icon: <SearchIcon />, run: () => scope.showAll!(q) });
      }
      return items;
    }
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords ?? ""} ${c.group}`.toLowerCase().includes(q));
  }, [scope, found, query, commands]);

  useEffect(() => setActive(0), [query, open, scope]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (row: Row | undefined) => {
    if (!row) return;
    const keep = row.run();
    if (keep === true) {
      // Picked inside a multi-select scope: refresh checkmarks, stay open.
      setFound((f) => (f ? { ...f, items: [...f.items] } : f));
      return;
    }
    set({ open: false });
    setQuery("");
  };

  // Commands run after the dialog starts closing, so navigation or a file picker gets focus.
  const runRow = (row: Row | undefined) => {
    if (!row) return;
    if (scope) return run(row);
    set({ open: false });
    setQuery("");
    window.setTimeout(row.run, 0);
  };

  let lastGroup = "";
  const pending = scope && (searching || found?.query !== query);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        set({ open: v });
        if (!v) setQuery("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          aria-label={scope?.label ?? "Command menu"}
          className="fixed inset-x-0 top-[round(down,14vh,1px)] z-50 mx-auto w-[560px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[14px] bg-overlay shadow-(--shadow-float) outline-none transition-[scale,opacity] duration-150 ease-[var(--ease-out)] data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
        >
          <div className="flex h-12 items-center gap-2.5 border-b border-line px-4">
            <SearchIcon className="shrink-0 text-fg-3" />
            {scope ? (
              // The scope reads like a token in the field; Backspace on an empty field removes it.
              <button
                type="button"
                onClick={() => set({ scope: null })}
                title="Search everything instead"
                className="group flex h-6 shrink-0 items-center gap-1 rounded-concentric-2 bg-raised pr-1 pl-2 text-[12px] font-medium text-fg-2 hover:text-fg"
              >
                {scope.label}
                <CloseIcon size={11} className="text-fg-3 group-hover:text-fg-2" />
              </button>
            ) : null}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(rows.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  runRow(rows[active]);
                } else if (e.key === "Backspace" && !query && scope) {
                  e.preventDefault();
                  set({ scope: null });
                }
              }}
              placeholder={scope ? "Type to search…" : "Type a command or search…"}
              aria-label={scope?.label ?? "Command"}
              role="combobox"
              aria-expanded
              aria-controls="command-list"
              aria-activedescendant={rows[active] ? `command-${rows[active]!.id}` : undefined}
              spellCheck={false}
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] placeholder:text-fg-3"
              style={{ outline: "none" }}
            />
            {pending ? <span aria-hidden className="spinner !size-3.5 shrink-0" /> : null}
          </div>
          <div ref={listRef} id="command-list" role="listbox" className="max-h-[min(400px,60vh)] overflow-y-auto p-1.5 [scrollbar-width:thin]">
            {rows.length === 0 ? (
              <p className="px-3 py-8 text-center text-fg-3">{pending ? "Searching…" : "No results"}</p>
            ) : (
              rows.map((row, i) => {
                const header = row.group && row.group !== lastGroup ? row.group : null;
                lastGroup = row.group;
                return (
                  <div key={row.id}>
                    {header ? <div className="px-2.5 pt-2.5 pb-1 text-[11.5px] font-medium text-fg-3">{header}</div> : null}
                    {!row.group && i > 0 ? <div className="-mx-1.5 my-1.5 h-px bg-line" /> : null}
                    <div
                      id={`command-${row.id}`}
                      role="option"
                      aria-selected={i === active}
                      data-index={i}
                      onMouseMove={() => i !== active && setActive(i)}
                      onClick={() => runRow(row)}
                      className={`flex cursor-default items-center gap-2.5 rounded-[8px] px-2.5 text-[13px] text-fg-2 aria-selected:bg-hover aria-selected:text-fg ${
                        row.image ? "h-11" : "h-9"
                      }`}
                    >
                      {row.image ? (
                        <span className="grid size-8 shrink-0 place-items-center">
                          <img src={row.image} alt="" loading="lazy" draggable={false} className="max-h-8 max-w-8 object-contain" />
                        </span>
                      ) : (
                        <span className="grid size-4 shrink-0 place-items-center text-fg-3">{row.icon}</span>
                      )}
                      <span dir="auto" className="min-w-0 flex-1 truncate">
                        {row.label}
                        {row.detail ? <span className="ml-2 text-[12px] text-fg-3">{row.detail}</span> : null}
                      </span>
                      {row.selected ? <CheckIcon size={14} className="shrink-0 text-fg" /> : null}
                      {row.hint ? <span className="text-[12px] text-fg-3">{row.hint}</span> : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The header search, as a button: it looks like a field but opens the menu scoped to the page.
 * When the page has an active search, it shows that query with a way to clear it.
 */
export function SearchButton({
  label,
  query,
  onOpen,
  onClear,
  className = "",
}: {
  label: string;
  query: string;
  onOpen: () => void;
  onClear: () => void;
  className?: string;
}) {
  return (
    <div className={`group relative flex h-7 min-w-0 items-center rounded-[7px] bg-raised transition-[background-color] duration-150 hover:bg-overlay ${className}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-[7px] pr-1.5 pl-2 text-left text-[13px]"
      >
        <SearchIcon size={14} className="shrink-0 text-fg-3" />
        <span className={`min-w-0 flex-1 truncate ${query ? "text-fg" : "text-fg-3"}`}>{query || label}</span>
        {query ? null : (
          <kbd className="hidden h-5 min-w-5 items-center justify-center rounded-concentric px-1 text-[11px] font-medium text-fg-3 shadow-[inset_0_0_0_1px_var(--color-line-strong)] sm:inline-flex">
            /
          </kbd>
        )}
      </button>
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="mr-0.5 grid size-6 shrink-0 place-items-center rounded-concentric-0.5 text-fg-3 hover:text-fg"
        >
          <CloseIcon size={13} />
        </button>
      ) : null}
    </div>
  );
}
