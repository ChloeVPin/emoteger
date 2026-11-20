"use client";

import { inputHints } from "@ui-sdk/core";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandItemIcon,
  CommandList,
  CommandSeparator,
} from "@ui-sdk/react/command";
import { Dialog, DialogBackdrop, DialogContent, DialogTitle } from "@ui-sdk/react/dialog";
import { useShortcut } from "@ui-sdk/react/shortcuts";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { GuildSummary } from "@/lib/types";
import { GuildIcon } from "./avatar";
import { Button } from "./button";
import {
  CheckIcon,
  CloseIcon,
  CompassIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  ServersIcon,
  SmileIcon,
  StickerIcon,
  TrashIcon,
} from "./icons";
import { type Section, sectionPath, useSection } from "./manager/sections";

export type ScopeResult = {
  id: string;
  label: string;
  detail?: string;
  image?: string;
  selected?: boolean;
};

export type SearchScope = {
  label: string;
  initial?: string;
  search: (query: string, signal: AbortSignal) => Promise<ScopeResult[]> | ScopeResult[];
  pick: (id: string) => boolean | void;
  isSelected?: (id: string) => boolean;
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

export type PageCommand = "upload" | "delete-all";
export const PAGE_COMMAND = "emoteger:command";

type Row = {
  id: string;
  group: string;
  label: string;
  icon?: React.ReactNode;
  image?: string;
  detail?: string;
  keywords?: string[];
  hint?: string;
  selected?: boolean;
  run: () => boolean | void;
};

const searchHints = inputHints("search");

export function CommandMenu({ guildId, guilds }: { guildId: string; guilds: GuildSummary[] }) {
  const { open, scope } = useMenu();
  const router = useRouter();
  const section = useSection();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; items: ScopeResult[] } | null>(null);
  const [searching, setSearching] = useState(false);

  useShortcut(
    "mod+k",
    () => {
      if (state.open) set({ open: false });
      else set({ open: true, scope: null });
    },
    { description: "Open command menu", allowInInput: true },
  );

  useEffect(() => {
    if (open) setQuery(scope?.initial ?? "");
    else setFound(null);
  }, [open, scope]);

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
        { id: "upload", group: "Actions", label: `Upload ${noun}`, icon: <PlusIcon />, keywords: ["Actions", "add", "new", "file"], run: page("upload") },
        { id: "delete-all", group: "Actions", label: `Delete all ${noun}…`, icon: <TrashIcon />, keywords: ["Actions", "remove", "clear"], run: page("delete-all") },
      );
    }
    list.push(
      { id: "go-emote", group: "Go to", label: "Emotes", icon: <SmileIcon />, keywords: ["Go to"], hint: section === "emote" ? "Current" : undefined, run: go("emote") },
      { id: "go-sticker", group: "Go to", label: "Stickers", icon: <StickerIcon />, keywords: ["Go to"], hint: section === "sticker" ? "Current" : undefined, run: go("sticker") },
      { id: "go-browse", group: "Go to", label: "Browse", icon: <CompassIcon />, keywords: ["Go to", "emoji.gg", "7tv", "noto", "fluent", "import", "find"], hint: section === "browse" ? "Current" : undefined, run: go("browse") },
      ...guilds
        .filter((g) => g.id !== guildId)
        .map((g) => ({
          id: `server-${g.id}`,
          group: "Servers",
          label: g.name,
          icon: <GuildIcon guild={g} size={16} />,
          keywords: ["Servers", "switch", "server"],
          run: go(section, g.id),
        })),
      { id: "all-servers", group: "Servers", label: "All servers", icon: <ServersIcon />, keywords: ["Servers"], run: () => router.push("/servers") },
      {
        id: "sign-out",
        group: "Account",
        label: "Sign out",
        icon: <LogOutIcon />,
        keywords: ["Account", "log", "out"],
        run: () => {
          const form = Object.assign(document.createElement("form"), { method: "post", action: "/api/auth/logout" });
          document.body.appendChild(form);
          form.submit();
        },
      },
    );
    return list;
  }, [guildId, guilds, router, section]);

  const scopedRows = useMemo<Row[]>(() => {
    if (!scope) return [];
    const items: Row[] = (found?.items ?? []).map((r) => ({
      id: `scope-${r.id}`,
      group: "Results",
      label: r.label,
      detail: r.detail,
      image: r.image,
      selected: scope.isSelected?.(r.id) ?? r.selected,
      run: () => scope.pick(r.id),
    }));
    const q = query.trim();
    if (q && scope.showAll && (found?.items.length ?? 0) > 0) {
      items.push({ id: "show-all", group: "", label: `Show all results for “${q}”`, icon: <SearchIcon />, run: () => scope.showAll!(q) });
    }
    return items;
  }, [scope, found, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of commands) {
      const bucket = map.get(row.group) ?? [];
      bucket.push(row);
      map.set(row.group, bucket);
    }
    return [...map.entries()];
  }, [commands]);

  const pending = Boolean(scope && (searching || found?.query !== query));

  const renderItem = (row: Row) => (
    <CommandItem
      key={row.id}
      value={row.id}
      label={row.label}
      keywords={row.keywords}
      onSelect={(event) => {
        if (scope) {
          const keep = row.run();
          if (keep === true) {
            event.preventDefault();
            setFound((f) => (f ? { ...f, items: [...f.items] } : f));
            return;
          }
          set({ open: false });
          setQuery("");
          return;
        }
        set({ open: false });
        setQuery("");
        // Run after the dialog begins closing so navigation or the file picker receives focus.
        window.setTimeout(row.run, 0);
      }}
      className={`flex cursor-default items-center gap-2.5 rounded-[8px] px-2.5 text-[13px] text-fg-2 outline-none select-none data-highlighted:bg-hover data-highlighted:text-fg ${
        row.image ? "h-11" : "h-9"
      }`}
    >
      {row.image ? (
        <span className="grid size-8 shrink-0 place-items-center">
          <img src={row.image} alt="" loading="lazy" draggable={false} className="max-h-8 max-w-8 object-contain" />
        </span>
      ) : (
        <CommandItemIcon className="grid size-4 shrink-0 place-items-center text-fg-3">{row.icon}</CommandItemIcon>
      )}
      <span dir="auto" className="min-w-0 flex-1 truncate">
        {row.label}
        {row.detail ? <span className="ml-2 text-[12px] text-fg-3">{row.detail}</span> : null}
      </span>
      {row.selected ? <CheckIcon size={14} className="shrink-0 text-fg" /> : null}
      {row.hint ? <span className="text-[12px] text-fg-3">{row.hint}</span> : null}
    </CommandItem>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        set({ open: v });
        if (!v) setQuery("");
      }}
    >
      <DialogBackdrop className="fixed inset-0 z-50 m-0 border-0 bg-black/40 p-0 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
      <DialogContent className="fixed inset-x-0 top-[round(down,14vh,1px)] bottom-auto z-50 mx-auto my-0 h-fit w-[560px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[14px] border-0 bg-overlay p-0 shadow-(--shadow-float) outline-none transition-[scale,opacity] duration-150 ease-[var(--ease-out)] data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:duration-100 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none">
        <DialogTitle className="sr-only">{scope?.label ?? "Command menu"}</DialogTitle>
        <Command
          query={query}
          onQueryChange={setQuery}
          filter={scope ? false : "fuzzy"}
          status={pending ? "loading" : "idle"}
        >
          <div className="flex h-12 items-center gap-2.5 border-b border-line px-4">
            <SearchIcon className="shrink-0 text-fg-3" />
            {scope ? (
              <Button
                variant="quiet"
                aria-label={`Search everything instead of ${scope.label}`}
                onClick={() => set({ scope: null })}
                title="Search everything instead"
                className="group !h-6 shrink-0 !gap-1 rounded-concentric-2 !pr-1 !pl-2 !text-[12px] text-fg-2 hover:text-fg"
              >
                {scope.label}
                <CloseIcon size={11} className="text-fg-3 group-hover:text-fg-2" />
              </Button>
            ) : null}
            <CommandInput
              {...searchHints}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !query && scope) {
                  e.preventDefault();
                  set({ scope: null });
                }
              }}
              placeholder={scope ? "Type to search…" : "Type a command or search…"}
              aria-label={scope?.label ?? "Search commands"}
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] placeholder:text-fg-3 focus-visible:outline-none"
            />
            {pending ? <span aria-hidden className="spinner !size-3.5 shrink-0" /> : null}
          </div>
          <CommandEmpty className="px-3 py-8 text-center text-fg-3 empty:hidden">
            {(s) => (s.empty ? (s.loading ? "Searching…" : "No results") : null)}
          </CommandEmpty>
          <CommandList className="max-h-[min(400px,60vh)] overflow-y-auto p-1.5 [scrollbar-width:thin] data-empty:hidden">
            {scope ? (
              <>
                {scopedRows.some((r) => r.group === "Results") ? (
                  <CommandGroup>
                    <CommandGroupLabel className="px-2.5 pt-2.5 pb-1 text-[11.5px] font-medium text-fg-3">
                      Results
                    </CommandGroupLabel>
                    {scopedRows.filter((r) => r.group === "Results").map(renderItem)}
                  </CommandGroup>
                ) : null}
                {scopedRows
                  .filter((r) => !r.group)
                  .map((r) => (
                    <Fragment key={r.id}>
                      {scopedRows.length > 1 ? <CommandSeparator className="-mx-1.5 my-1.5 h-px bg-line" /> : null}
                      {renderItem(r)}
                    </Fragment>
                  ))}
              </>
            ) : (
              groups.map(([group, items]) => (
                <CommandGroup key={group}>
                  <CommandGroupLabel className="px-2.5 pt-2.5 pb-1 text-[11.5px] font-medium text-fg-3">
                    {group}
                  </CommandGroupLabel>
                  {items.map(renderItem)}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

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
    <div
      className={`group relative flex h-7 min-w-0 items-center rounded-[7px] bg-raised transition-[background-color] duration-150 hover:bg-overlay ${className}`}
    >
      <Button
        variant="ghost"
        onClick={onOpen}
        aria-label={label}
        className="!h-full min-w-0 flex-1 !justify-start !gap-2 !rounded-[7px] !bg-transparent !pr-1.5 !pl-2 text-left !text-[13px] !font-normal"
      >
        <SearchIcon size={14} className="shrink-0 text-fg-3" />
        <span className={`min-w-0 flex-1 truncate ${query ? "text-fg" : "text-fg-3"}`}>{query || label}</span>
        {query ? null : (
          <kbd className="hidden h-5 min-w-5 items-center justify-center rounded-concentric px-1 text-[11px] font-medium text-fg-3 shadow-[inset_0_0_0_1px_var(--color-line-strong)] sm:inline-flex">
            /
          </kbd>
        )}
      </Button>
      {query ? (
        <Button
          variant="ghost"
          aria-label="Clear search"
          onClick={onClear}
          className="mr-0.5 !size-6 shrink-0 !rounded-concentric-0.5 !p-0 text-fg-3 hover:text-fg"
        >
          <CloseIcon size={13} />
        </Button>
      ) : null}
    </div>
  );
}
