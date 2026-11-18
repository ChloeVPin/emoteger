"use client";

import { createLocalStorage } from "@ui-sdk/core";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@ui-sdk/react/alert-dialog";
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@ui-sdk/react/meter";
import { useShortcut } from "@ui-sdk/react/shortcuts";
import { toast } from "@ui-sdk/react/toast";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { NAME_PATTERN, sanitizeName, uniqueName } from "@/lib/names";
import {
  type AssetKind,
  type CatalogCategory,
  type CatalogItem,
  type CatalogPage,
  type CatalogSource,
  type GuildDetail,
  type Pack,
  SOURCE_KIND,
} from "@/lib/types";
import { Button } from "../button";
import { SearchButton, commandMenu } from "../command-menu";
import { ArrowUpRightIcon, CheckIcon, ChevronsIcon, CompassIcon, PlusIcon } from "../icons";
import { bulk, useBulk } from "../manager/bulk";
import { Segmented } from "../manager/segmented";
import type { Filter, Item } from "../manager/types";
import { useMediaQuery } from "../manager/use-media-query";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, itemClass, popupClass } from "../menu";
import { PageHeader, headerButton } from "../page-header";
import { TileGrid, TileGridItem } from "../tile-grid-parts";
import { PackDetails, PackGrid } from "./packs";

const SOURCES: Record<AssetKind, { value: CatalogSource; label: string }[]> = {
  emote: [
    { value: "emojigg", label: "emoji.gg" },
    { value: "7tv", label: "7TV" },
  ],
  sticker: [
    { value: "noto", label: "Noto" },
    { value: "fluent", label: "Fluent" },
  ],
};

const SOURCE_NAME: Record<CatalogSource, string> = { emojigg: "emoji.gg", "7tv": "7TV", noto: "Google Noto", fluent: "Fluent Emoji" };

const ageStorage = createLocalStorage("emoteger:age-confirmed");

const MODE_OPTIONS = [
  { value: "packs" as const, label: "Packs" },
  { value: "emote" as const, label: "Emotes" },
  { value: "sticker" as const, label: "Stickers" },
];

const keyOf = (i: Pick<CatalogItem, "source" | "id">) => `${i.source}:${i.id}`;

const PAGE_TTL = 5 * 60 * 1000;
const pageCache = new Map<string, { at: number; page: CatalogPage }>();
let categoryCache: CatalogCategory[] | null = null;

const brokenKeys = new Set<string>();
function reportBroken(item: CatalogItem) {
  const key = keyOf(item);
  if (brokenKeys.has(key)) return;
  brokenKeys.add(key);
  void fetch("/api/catalog/broken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: item.source, id: item.id }),
  }).catch(() => {});
}

function middle(name: string, max = 13) {
  if (name.length <= max) return name;
  const head = Math.ceil((max - 1) / 2);
  return `${name.slice(0, head)}…${name.slice(name.length - (max - 1 - head))}`;
}

function CatalogTile({
  item,
  index,
  selected,
  added,
  onBroken,
  large,
}: {
  large: boolean;
  item: CatalogItem;
  index: number;
  selected: boolean;
  added: boolean;
  onBroken: (item: CatalogItem) => void;
}) {
  const [hover, setHover] = useState(false);
  const img = large ? "h-20 w-auto max-w-full object-contain" : "h-11 w-auto max-w-[min(100%,96px)] object-contain";
  return (
    <li className="min-w-0">
      <TileGridItem
        value={keyOf(item)}
        label={item.name}
        index={index}
        disabled={added}
        aria-label={item.name}
        title={`${item.name}${item.author ? ` · by ${item.author}` : ""}`}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className="tile group relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-tile px-1 pt-2 pb-1.5 outline-offset-0 data-disabled:pointer-events-none"
      >
        <span className={`relative grid w-full place-items-center ${large ? "h-20" : "h-11"}`}>
          <img
            src={item.preview}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => onBroken(item)}
            className={`${img} ${added ? "opacity-35" : ""} ${hover && item.animatedPreview ? "invisible" : ""}`}
          />
          {hover && item.animatedPreview ? (
            <img src={item.animatedPreview} alt="" draggable={false} className={`absolute ${img}`} />
          ) : null}
        </span>
        <span className={`w-full truncate text-center text-[11px] leading-[14px] ${added ? "text-fg-3" : "text-fg-3 group-aria-pressed:text-fg group-data-pressed:text-fg"}`}>
          {added ? "Added" : large ? item.name : middle(item.name)}
        </span>
        {selected || added ? (
          <span
            aria-hidden
            className={`absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full ${added ? "bg-raised text-fg-3" : "bg-fg text-bg"}`}
          >
            <CheckIcon size={10} strokeWidth={2.25} />
          </span>
        ) : null}
      </TileGridItem>
    </li>
  );
}

function SkeletonGrid() {
  return (
    <ul aria-hidden className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1 sm:grid-cols-[repeat(auto-fill,minmax(88px,1fr))]">
      {Array.from({ length: 30 }, (_, i) => (
        <li key={i} className="flex aspect-square flex-col items-center justify-center gap-2">
          <span className="size-11 animate-pulse rounded-[10px] bg-raised" style={{ animationDelay: `${(i % 6) * 80}ms` }} />
          <span className="h-2 w-12 animate-pulse rounded-full bg-raised" style={{ animationDelay: `${(i % 6) * 80}ms` }} />
        </li>
      ))}
    </ul>
  );
}

function Slots({ label, used, adding, limit }: { label: string; used: number; adding: number; limit: number }) {
  const over = used + adding - limit;
  const pct = (n: number) => `${Math.min(100, (n / Math.max(1, limit)) * 100)}%`;
  return (
    <Meter
      value={used + adding}
      min={0}
      max={Math.max(1, limit)}
      getValueLabel={(v) => `${v} of ${limit} slots`}
    >
      <div className="flex h-6 items-center justify-between">
        <MeterLabel className="text-fg-2">{label}</MeterLabel>
        <MeterValue className="tabular text-fg-3">
          <span className={over > 0 ? "text-danger" : "text-fg"}>{used + adding}</span> / {limit}
        </MeterValue>
      </div>
      <MeterTrack className="relative mt-1 h-[3px] w-full overflow-hidden rounded-full bg-line">
        <MeterIndicator className="sr-only" />
        <div className="absolute inset-y-0 left-0 rounded-full bg-fg-2 transition-[width] duration-300" style={{ width: pct(used) }} />
        <div
          className={`absolute inset-y-0 rounded-full transition-[left,width] duration-300 ${over > 0 ? "bg-danger" : "bg-fg-2/45"}`}
          style={{ left: pct(used), width: pct(Math.max(0, Math.min(adding, limit - used + Math.max(0, over)))) }}
        />
      </MeterTrack>
      {over > 0 ? <p className="mt-1.5 text-[12px] text-danger">{over} over the limit</p> : null}
    </Meter>
  );
}

export function Browse({
  guild,
  existing,
  existingStickers,
  packs,
}: {
  guild: GuildDetail;
  existing: Omit<Item, "key">[];
  existingStickers: Omit<Item, "key">[];
  packs: Pack[];
}) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [kind, setKind] = useState<AssetKind>("emote");
  const [mode, setMode] = useState<"packs" | "browse">(packs.length ? "packs" : "browse");
  const [packId, setPackId] = useState<string | null>(null);
  const pack = packs.find((p) => p.id === packId) ?? null;
  const [source, setSource] = useState<CatalogSource>("emojigg");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<CatalogCategory | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>(() => categoryCache ?? []);
  const [initial] = useState(() => {
    const hit = pageCache.get(`/api/catalog?${new URLSearchParams({ source: "emojigg", q: "", page: "1", animated: "all" })}`);
    return hit && Date.now() - hit.at <= PAGE_TTL ? hit.page : null;
  });
  const [items, setItems] = useState<CatalogItem[]>(() => initial?.items ?? []);
  const [nextPage, setNextPage] = useState<number | null>(() => (initial ? initial.nextPage : 1));
  const [state, setState] = useState<"loading" | "ready" | "more" | "error">(() => (initial ? "ready" : "loading"));
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, CatalogItem>>(() => new Map());
  const [owned, setOwned] = useState(() => ({
    emote: existing.map((e) => ({ name: e.name, animated: e.animated })),
    sticker: existingStickers.map((e) => ({ name: e.name, animated: e.animated })),
  }));
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [retry, setRetry] = useState(0);
  const [broken, setBroken] = useState<Set<string>>(() => new Set(brokenKeys));
  const dq = useDeferredValue(query);
  const job = useBulk();
  const busy = job?.phase === "running";
  const sentinel = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);

  const used = useMemo(() => {
    const list = owned[kind];
    const animated = list.filter((e) => e.animated).length;
    return { static: list.length - animated, animated, total: list.length };
  }, [owned, kind]);
  const stickerLimit = guild.stickerLimit;
  const picking = useMemo(() => {
    const list = [...selected.values()];
    const animated = list.filter((i) => i.animated).length;
    return { static: list.length - animated, animated, total: list.length };
  }, [selected]);
  const overLimit =
    kind === "sticker"
      ? used.total + picking.total > stickerLimit
      : used.static + picking.static > guild.limit || used.animated + picking.animated > guild.limit;

  const params = useCallback(
    (page: number) =>
      new URLSearchParams({
        source,
        q: dq.trim(),
        page: String(page),
        animated: filter,
        ...(source === "emojigg" && category ? { category: category.id } : {}),
        ...(source === "emojigg" && category?.adult ? { nsfw: "1" } : {}),
      }),
    [source, dq, filter, category],
  );

  const load = useCallback(
    async (page: number) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const url = `/api/catalog?${params(page)}`;
      const hit = pageCache.get(url);
      if (!hit || Date.now() - hit.at > PAGE_TTL) setState(page === 1 ? "loading" : "more");
      try {
        let body: CatalogPage;
        if (hit && Date.now() - hit.at <= PAGE_TTL) {
          body = hit.page;
        } else {
          const res = await fetch(url, { signal: controller.signal });
          if (res.status === 401) return void (window.location.href = "/api/auth/reset");
          const json = (await res.json()) as CatalogPage & { error?: string };
          if (!res.ok) throw new Error(json.error ?? "Something went wrong");
          body = { items: json.items, nextPage: json.nextPage };
          pageCache.set(url, { at: Date.now(), page: body });
        }
        setItems((prev) => {
          if (page === 1) return body.items;
          const seen = new Set(prev.map(keyOf));
          return [...prev, ...body.items.filter((i) => !seen.has(keyOf(i)))];
        });
        setNextPage(body.nextPage);
        setState("ready");
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError((e as Error).message);
        setState("error");
      }
    },
    [params],
  );

  useEffect(() => {
    const id = window.setTimeout(() => void load(1), dq === query ? 0 : 250);
    return () => window.clearTimeout(id);
  }, [load, dq, query, retry]);

  useEffect(() => {
    if (source !== "emojigg" || categories.length) return;
    fetch("/api/catalog?categories=1&v=3")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: CatalogCategory[]) => {
        if (list.length) categoryCache = list;
        setCategories(list);
      })
      .catch(() => {});
  }, [source, categories.length]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || state !== "ready" || !nextPage || nextPage === 1) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void load(nextPage), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [state, nextPage, load]);

  useEffect(() => {
    setAdded(new Set([...items].map(keyOf).filter((k) => bulk.wasImported(k))));
    return bulk.onAdded((gid, emote, key) => {
      if (gid !== guild.id) return;
      setAdded((prev) => new Set(prev).add(key));
      const k = SOURCE_KIND[key.split(":")[0] as CatalogSource] ?? "emote";
      setOwned((prev) => ({ ...prev, [k]: [...prev[k], { name: emote.name, animated: emote.animated }] }));
    });
  }, [guild.id]);

  const markBroken = useCallback((item: CatalogItem) => {
    const key = keyOf(item);
    reportBroken(item);
    setBroken((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    setSelected((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const visible = useMemo(() => items.filter((i) => !broken.has(keyOf(i))), [items, broken]);
  const visibleMap = useMemo(() => new Map(visible.map((i) => [keyOf(i), i])), [visible]);

  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const toggle = useCallback((item: CatalogItem) => {
    const next = new Map(selectedRef.current);
    const key = keyOf(item);
    if (next.has(key)) next.delete(key);
    else next.set(key, item);
    selectedRef.current = next;
    setSelected(next);
  }, []);

  const openSearch = useCallback(() => {
    const seen = new Map<string, CatalogItem>();
    commandMenu.open({
      label: `Search ${SOURCE_NAME[source]}`,
      initial: query,
      search: async (q, signal) => {
        const params = new URLSearchParams({
          source,
          q,
          page: "1",
          animated: filter,
          ...(source === "emojigg" && category ? { category: category.id } : {}),
          ...(source === "emojigg" && category?.adult ? { nsfw: "1" } : {}),
        });
        const res = await fetch(`/api/catalog?${params}`, { signal });
        if (!res.ok) return [];
        const page = (await res.json()) as CatalogPage;
        return page.items
          .filter((i) => !broken.has(keyOf(i)) && !added.has(keyOf(i)))
          .slice(0, 30)
          .map((i) => {
            seen.set(keyOf(i), i);
            return { id: keyOf(i), label: i.name, detail: i.author ?? undefined, image: i.preview };
          });
      },
      pick: (key) => {
        const item = seen.get(key);
        if (item) toggle(item);
        return true;
      },
      isSelected: (key) => selectedRef.current.has(key),
      showAll: (q) => setQuery(q),
    });
  }, [source, query, filter, category, broken, added, toggle]);

  useShortcut("/", openSearch, {
    description: `Search ${SOURCE_NAME[source]}`,
    when: () => mode === "browse",
  });

  const add = () => {
    if (!picking.total || overLimit) return;
    const taken = new Set(owned[kind].map((e) => e.name.toLowerCase()));
    const targets = [...selected.values()].map((item) => {
      const base =
        kind === "sticker"
          ? item.name.slice(0, 30)
          : NAME_PATTERN.test(item.name)
            ? item.name
            : sanitizeName(item.name);
      let name = kind === "sticker" ? base : uniqueName(base, taken);
      for (let i = 2; kind === "sticker" && taken.has(name.toLowerCase()); i++) name = `${base.slice(0, 30 - String(i).length - 1)} ${i}`;
      taken.add(name.toLowerCase());
      return { key: keyOf(item), id: item.id, name, source: item.source, preview: item.preview };
    });
    if (bulk.importNow({ guildId: guild.id, guildName: guild.name, kind, targets })) setSelected(new Map());
    else toast("Another job is still running", { description: "Wait for it to finish, then add these." });
  };

  const [askAge, setAskAge] = useState<CatalogCategory | null>(null);
  const chooseCategory = (c: CatalogCategory | null) => {
    if (!c?.adult) return setCategory(c);
    if (ageStorage.get() === "1") setCategory(c);
    else setAskAge(c);
  };

  const switchSource = (s: CatalogSource) => {
    setSource(s);
    setCategory(null);
    setItems([]);
  };

  const switchKind = (k: AssetKind) => {
    if (k === kind) return;
    setKind(k);
    setSelected(new Map());
    setFilter("all");
    switchSource(SOURCES[k][0]!.value);
  };

  const filterOptions = [
    { value: "all" as const, label: "All" },
    { value: "static" as const, label: "Static" },
    { value: "animated" as const, label: "Animated" },
  ];

  const lastPicked = [...selected.values()].at(-1) ?? null;
  const selectedKeys = useMemo(() => [...selected.keys()], [selected]);

  return (
    <>
      <PageHeader icon={<CompassIcon />} title="Browse">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 lg:flex-nowrap lg:justify-end">
          <Segmented
            size="sm"
            label="Type"
            options={MODE_OPTIONS}
            value={mode === "packs" ? "packs" : kind}
            onChange={(v) => {
              if (v === "packs") return setMode("packs");
              setMode("browse");
              switchKind(v);
            }}
          />
          {mode === "browse" ? (
            <>
              <Segmented size="sm" label="Source" options={SOURCES[kind]} value={source} onChange={switchSource} />
              {source === "emojigg" ? (
                <Menu
                  onAction={(id) => {
                    const chosen = categories.find((c) => c.id === id) ?? null;
                    chooseCategory(id === "__all__" ? null : chosen);
                  }}
                >
                  <MenuTrigger aria-label="Category" className={`${headerButton} bg-raised pr-1.5 pl-2.5`}>
                    <span className="max-w-[14ch] truncate">{category?.name ?? "All categories"}</span>
                    <ChevronsIcon size={12} className="text-fg-3" />
                  </MenuTrigger>
                  <MenuContent sideOffset={6} align="start" className={`${popupClass} max-h-[min(380px,var(--available-height))] overflow-y-auto`}>
                    {[{ id: "__all__", name: "All categories" } as CatalogCategory, ...categories].map((c) => (
                      <div key={c.id}>
                        {c.adult ? <MenuSeparator className="-mx-1 my-1 h-px bg-line" /> : null}
                        <MenuItem value={c.id} label={c.name} className={itemClass}>
                          <span className="flex-1">{c.name}</span>
                          {c.adult ? (
                            <span className="rounded-[4px] px-1 text-[11px] font-medium text-fg-3 shadow-[inset_0_0_0_1px_var(--color-line-strong)]">18+</span>
                          ) : null}
                          {c.count ? <span className="tabular text-[12px] text-fg-3">{c.count.toLocaleString()}</span> : null}
                          {(category?.id ?? "__all__") === c.id ? <CheckIcon size={14} className="text-fg-2" /> : null}
                        </MenuItem>
                      </div>
                    ))}
                  </MenuContent>
                </Menu>
              ) : null}
              <SearchButton
                label={`Search ${SOURCE_NAME[source]}`}
                query={query}
                onOpen={openSearch}
                onClear={() => setQuery("")}
                className="order-last basis-full sm:order-none sm:max-w-56 sm:flex-1 sm:basis-auto lg:w-52 lg:flex-none"
              />
              {kind === "emote" ? (
                <div className="ml-auto lg:ml-0">
                  <Segmented size="sm" label="Filter" options={filterOptions} value={filter} onChange={setFilter} />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </PageHeader>

      {mode === "packs" ? (
        <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-label="Packs" className="emote-scroll min-w-0 px-2 pt-3 pb-32 sm:px-3 lg:overflow-y-auto lg:pb-10">
            {!isDesktop && pack ? (
              <div className="mb-3 overflow-hidden rounded-[16px] bg-surface lg:hidden">
                <PackDetails pack={pack} guild={guild} owned={owned} busy={busy} />
              </div>
            ) : null}
            <PackGrid packs={packs} selected={packId} onSelect={setPackId} />
          </section>
          <aside
            aria-label="Pack"
            data-agent-hidden={!isDesktop ? "" : undefined}
            className="hidden min-h-0 flex-col border-l border-line lg:flex"
          >
            {isDesktop && pack ? (
              <PackDetails key={pack.id} pack={pack} guild={guild} owned={owned} busy={busy} />
            ) : (
              <p className="p-4 text-[12px] leading-[18px] text-fg-3">
                Packs are hand-picked sets with a bit of history behind them. Open one to see what&rsquo;s inside,
                then add the whole set to <span dir="auto">{guild.name}</span> at once, or download it.
              </p>
            )}
          </aside>
        </div>
      ) : (
        <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col lg:min-h-0">
            <section aria-label="Results" className="emote-scroll min-w-0 flex-1 px-2 pt-3 pb-32 sm:px-3 lg:overflow-y-auto lg:pb-10">
              {state === "loading" ? (
                <SkeletonGrid />
              ) : state === "error" && items.length === 0 ? (
                <div className="grid min-h-[40dvh] place-items-center px-6 text-center">
                  <div>
                    <p className="font-medium">{error}</p>
                    <p className="mt-1 text-fg-2">The catalog didn&rsquo;t answer. Your server isn&rsquo;t affected.</p>
                    <Button className="mt-4" onClick={() => setRetry((n) => n + 1)}>
                      Try again
                    </Button>
                  </div>
                </div>
              ) : visible.length === 0 && state !== "more" ? (
                <p className="px-6 py-24 text-center text-fg-2">
                  Nothing on {SOURCE_NAME[source]} matches{query ? <> &ldquo;{query.trim()}&rdquo;</> : " this filter"}.
                </p>
              ) : (
                <>
                  <TileGrid
                    multiple
                    aria-label={`${SOURCE_NAME[source]} catalog`}
                    value={selectedKeys}
                    onValueChange={(next) => {
                      const keys = Array.isArray(next) ? next : [];
                      const map = new Map<string, CatalogItem>();
                      for (const key of keys) {
                        const existingItem = selectedRef.current.get(key) ?? visibleMap.get(key);
                        if (existingItem) map.set(key, existingItem);
                      }
                      selectedRef.current = map;
                      setSelected(map);
                    }}
                    className={`grid gap-1 ${
                      kind === "sticker"
                        ? "grid-cols-[repeat(auto-fill,minmax(104px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(128px,1fr))]"
                        : "grid-cols-[repeat(auto-fill,minmax(76px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(88px,1fr))]"
                    }`}
                  >
                    {visible.map((item, index) => (
                      <CatalogTile
                        key={keyOf(item)}
                        item={item}
                        index={index}
                        selected={selected.has(keyOf(item))}
                        added={added.has(keyOf(item))}
                        onBroken={markBroken}
                        large={kind === "sticker"}
                      />
                    ))}
                  </TileGrid>
                  <div ref={sentinel} className="flex h-16 items-center justify-center text-[12px] text-fg-3">
                    {state === "more" ? <span className="spinner" aria-label="Loading more" /> : null}
                    {state === "error" ? (
                      <Button variant="ghost" onClick={() => nextPage && void load(nextPage)} className="!h-7 !text-[12px]">
                        Couldn&rsquo;t load more. Try again
                      </Button>
                    ) : null}
                    {state === "ready" && !nextPage ? "That’s everything" : null}
                  </div>
                </>
              )}
            </section>
          </div>

          <aside
            aria-label="Selection"
            data-agent-hidden={!isDesktop ? "" : undefined}
            className="hidden min-h-0 flex-col border-l border-line lg:flex"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 [scrollbar-width:thin]">
              <div className="flex flex-col gap-4">
                {kind === "sticker" ? (
                  <Slots label="Stickers" used={used.total} adding={picking.total} limit={stickerLimit} />
                ) : (
                  <>
                    <Slots label="Static" used={used.static} adding={picking.static} limit={guild.limit} />
                    <Slots label="Animated" used={used.animated} adding={picking.animated} limit={guild.limit} />
                  </>
                )}
              </div>

              {picking.total ? (
                <div>
                  <div className="flex h-6 items-center justify-between">
                    <span className="font-medium">{picking.total} selected</span>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        selectedRef.current = new Map();
                        setSelected(new Map());
                      }}
                      className="!h-6 !px-1.5 !text-[12px] text-fg-3 hover:text-fg"
                    >
                      Clear selection
                    </Button>
                  </div>
                  <ul className="mt-2 grid grid-cols-6 gap-1">
                    {[...selected.values()].map((item) => (
                      <li key={keyOf(item)}>
                        <Button
                          variant="ghost"
                          aria-label={`Remove ${item.name}`}
                          title={`Remove ${item.name}`}
                          onClick={() => toggle(item)}
                          className="!grid aspect-square !h-auto w-full place-items-center !rounded-[8px] !bg-bg !p-0 [@media(hover:hover)]:hover:!bg-raised"
                        >
                          <img src={item.preview} alt="" className="h-7 w-auto max-w-[80%] object-contain" draggable={false} />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {lastPicked ? (
                    <a
                      href={lastPicked.page}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex items-center gap-1 text-[12px] text-fg-3 hover:text-fg-2"
                    >
                      <span className="truncate">
                        {lastPicked.name}
                        {lastPicked.author ? ` by ${lastPicked.author}` : ""} on {SOURCE_NAME[lastPicked.source]}
                      </span>
                      <ArrowUpRightIcon size={12} className="shrink-0" />
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-[12px] leading-[18px] text-fg-3">
                  Select {kind === "sticker" ? "stickers" : "emotes"} to add them to <span dir="auto">{guild.name}</span>{" "}
                  together. Names are fitted to Discord&rsquo;s rules and kept unique.
                </p>
              )}
            </div>
            <div className="border-t border-line p-4">
              <Button variant="sun" className="w-full" disabled={!picking.total || overLimit || busy} onClick={add}>
                <PlusIcon size={15} />
                {picking.total
                  ? `Add ${picking.total} ${kind === "sticker" ? (picking.total === 1 ? "sticker" : "stickers") : picking.total === 1 ? "emote" : "emotes"}`
                  : kind === "sticker"
                    ? "Add stickers"
                    : "Add emotes"}
              </Button>
              <p className="mt-3 text-[11px] leading-4 text-fg-3">
                {kind === "sticker"
                  ? "Noto Animated Emoji by Google (CC BY 4.0) and Fluent Emoji by Microsoft (MIT)."
                  : "Emotes on emoji.gg and 7TV are uploaded by their communities. Credit their creators."}
              </p>
            </div>
          </aside>
        </div>
      )}

      {!isDesktop && mode === "browse" && picking.total ? (
        <div className="phase-in fixed inset-x-3 bottom-3 z-40 flex items-center gap-2 rounded-[14px] bg-overlay p-2 pl-3.5 shadow-(--shadow-float) [margin-bottom:env(safe-area-inset-bottom)] lg:hidden">
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium">{picking.total} selected</span>
            {overLimit ? <span className="text-danger"> · over the limit</span> : null}
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              selectedRef.current = new Map();
              setSelected(new Map());
            }}
            className="rounded-concentric !px-2.5"
          >
            Clear selection
          </Button>
          <Button variant="sun" disabled={overLimit || busy} onClick={add} className="rounded-concentric">
            Add {picking.total}
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={askAge !== null}
        onOpenChange={(open, details) => {
          if (!open) {
            if (details.returnValue === "confirm" && askAge) {
              ageStorage.set("1");
              setCategory(askAge);
            }
            setAskAge(null);
          }
        }}
      >
        <AlertDialogBackdrop className="fixed inset-0 z-50 m-0 border-0 bg-black/55 p-0 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <AlertDialogContent className="fixed inset-x-0 top-[round(down,calc(50dvh-120px),1px)] bottom-auto z-50 mx-auto my-0 h-fit w-[380px] max-w-[calc(100vw-2rem)] rounded-[24px] border-0 bg-overlay p-4 shadow-(--shadow-float) outline-none transition-[scale,opacity] duration-150 ease-[var(--ease-out)] data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none">
          <AlertDialogTitle className="display text-[15px] font-semibold">Are you 18 or older?</AlertDialogTitle>
          <AlertDialogDescription className="mt-1.5 text-fg-2">
            The NSFW category has sexual and explicit emotes uploaded to emoji.gg. Anything you add will be visible to
            everyone in your server.
          </AlertDialogDescription>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-concentric">
            <AlertDialogClose className="pressable h-8 rounded-concentric bg-raised text-[13px] font-medium text-fg transition-[filter,background-color] duration-150">
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              value="confirm"
              data-agent-confirm="Shows adult (18+) emotes from emoji.gg"
              className="pressable h-8 rounded-concentric bg-raised text-[13px] font-medium text-fg transition-[filter,background-color] duration-150"
            >
              I&rsquo;m 18 or older
            </AlertDialogClose>
          </div>
          <p className="mt-3 text-center text-[11.5px] text-fg-3">Remembered on this device.</p>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
