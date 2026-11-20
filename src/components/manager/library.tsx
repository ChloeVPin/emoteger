"use client";

import { Drawer, DrawerBackdrop, DrawerClose, DrawerContent, DrawerTitle, createDrawerController } from "@ui-sdk/react/drawer";
import { FileInput, FileInputTrigger, createFileInputController } from "@ui-sdk/react/file-input";
import { useShortcut } from "@ui-sdk/react/shortcuts";
import { toast } from "@ui-sdk/react/toast";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { SessionUser } from "@/lib/session";
import type { AssetKind, GuildDetail } from "@/lib/types";
import { Button } from "../button";
import { PAGE_COMMAND, type PageCommand, SearchButton, commandMenu } from "../command-menu";
import { CloseIcon, MoreIcon, PlusIcon, SmileIcon, StickerIcon, TrashIcon, UploadIcon } from "../icons";
import { Menu, MenuContent, MenuItem, MenuItemIcon, MenuTrigger, itemClass, popupClass } from "../menu";
import { PageHeader, headerButton } from "../page-header";
import { TileGrid } from "../tile-grid-parts";
import { RateLimited, api } from "./api";
import { bulk, useBulk } from "./bulk";
import { DropOverlay } from "./drop-overlay";
import { Inspector } from "./inspector";
import { KINDS, type KindConfig } from "./kinds";
import { Overview } from "./overview";
import { Segmented } from "./segmented";
import { AddTile, Tile } from "./tile";
import type { Fields, Filter, Item } from "./types";
import { useMediaQuery } from "./use-media-query";

const REMOVE_MS = 180;

const isEditable = (el: Element | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export function Library({
  kind,
  user,
  guild,
  initial,
}: {
  kind: AssetKind;
  user: SessionUser;
  guild: GuildDetail;
  initial: Omit<Item, "key">[];
}) {
  const cfg = KINDS[kind];
  const limit = cfg.limit(guild);
  const [items, setItems] = useState<Item[]>(() => initial.map((e) => ({ ...e, key: e.id })));
  const job = useBulk();
  const busy = job?.phase === "running";
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [via, setVia] = useState<"pointer" | "keyboard">("pointer");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [fresh] = useState(() => new Set<string>());
  const [uploader] = useState(createFileInputController);
  const deferredQuery = useDeferredValue(query);
  const deferredFilter = useDeferredValue(filter);

  const itemsRef = useRef(items);
  const gridRef = useRef<HTMLUListElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const counts = useMemo(() => {
    const live = items.filter((i) => i.status !== "removing");
    const animated = live.filter((i) => i.animated).length;
    return { all: live.length, animated, static: live.length - animated };
  }, [items]);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase().replace(/^:|:$/g, "");
    return items.filter(
      (i) =>
        (deferredFilter === "all" || (deferredFilter === "animated") === i.animated) &&
        (!q ||
          i.name.toLowerCase().includes(q) ||
          i.id === q ||
          Boolean(i.tags?.toLowerCase().includes(q)) ||
          Boolean(i.description?.toLowerCase().includes(q))),
    );
  }, [items, deferredFilter, deferredQuery]);

  const selected = items.find((i) => i.key === selectedKey && i.status !== "removing") ?? null;

  const close = useCallback(() => setSelectedKey(null), []);

  const upload = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => cfg.accept.includes(f.type));
      if (images.length === 0) {
        if (files.length) toast.error(`Use ${cfg.acceptHint}`);
        return;
      }

      const live = itemsRef.current.filter((i) => i.status !== "removing");
      const taken = new Set(live.map((i) => i.name.toLowerCase()));
      const used = { static: 0, animated: 0 };
      live.forEach((i) => used[i.animated ? "animated" : "static"]++);

      const jobs: { key: string; name: string; image: string; preview: string }[] = [];
      const full = (animated: boolean) => (cfg.pooled ? used.static + used.animated : used[animated ? "animated" : "static"]) >= limit;
      for (const file of images) {
        let prepared: Awaited<ReturnType<typeof cfg.prepare>>;
        try {
          prepared = await cfg.prepare(file);
        } catch (error) {
          toast.error(file.name, { description: (error as Error).message });
          continue;
        }
        const pool = prepared.animated ? "animated" : "static";
        if (full(prepared.animated)) {
          toast.error(cfg.pooled ? `No ${cfg.noun} slots left` : `No ${pool} slots left`, { description: `${limit} of ${limit} used` });
          continue;
        }
        used[pool]++;
        const name = cfg.nameFromFile(file, taken);
        taken.add(name.toLowerCase());
        const key = `upload-${crypto.randomUUID()}`;
        fresh.add(key);
        window.setTimeout(() => fresh.delete(key), 1000);
        const preview = URL.createObjectURL(file);
        jobs.push({ key, name, image: prepared.image, preview });
        const pending: Item = {
          key,
          id: "",
          name,
          animated: prepared.animated,
          format: prepared.format,
          description: kind === "sticker" ? "" : undefined,
          tags: kind === "sticker" ? name : undefined,
          available: true,
          managed: false,
          addedBy: { id: user.id, name: user.globalName ?? user.username },
          preview,
          status: "uploading",
        };
        setItems((prev) => [...prev, pending]);
      }

      if (jobs.length === 0) return;
      setFilter("all");
      setQuery("");
      requestAnimationFrame(() =>
        gridRef.current
          ?.querySelector(`[data-key="${jobs[0]!.key}"]`)
          ?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }),
      );

      let added = 0;
      for (const job of jobs) {
        try {
          const created = await api.create(
            kind,
            guild.id,
            kind === "sticker" ? { name: job.name, description: "", tags: job.name, image: job.image } : { name: job.name, image: job.image },
          );
          added++;
          setItems((prev) => prev.map((i) => (i.key === job.key ? { ...created, key: job.key, preview: i.preview } : i)));
        } catch (error) {
          setItems((prev) => prev.filter((i) => i.key !== job.key));
          URL.revokeObjectURL(job.preview);
          toast.error(`Couldn't add ${cfg.quote(job.name)}`, { description: (error as Error).message });
        }
      }
      if (added) toast.success(added === 1 ? `Added ${cfg.quote(jobs[0]!.name)}` : `Added ${added} ${cfg.plural}`);
    },
    [guild.id, limit, user, fresh, cfg, kind],
  );

  const update = useCallback(
    async (key: string, fields: Fields) => {
      const before = itemsRef.current.find((i) => i.key === key);
      if (!before) return;
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...fields } : i)));
      try {
        const updated = await api.update(kind, guild.id, before.id, fields);
        setItems((prev) =>
          prev.map((i) =>
            i.key === key ? { ...i, name: updated.name, description: updated.description, tags: updated.tags } : i,
          ),
        );
      } catch (error) {
        setItems((prev) => prev.map((i) => (i.key === key ? before : i)));
        toast.error("Couldn't save", { description: (error as Error).message });
        throw error;
      }
    },
    [guild.id, kind],
  );

  const remove = useCallback(
    (key: string) => {
      const list = itemsRef.current;
      const index = list.findIndex((i) => i.key === key);
      const item = list[index];
      if (!item) return;

      setSelectedKey(null);
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, status: "removing" } : i)));
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => !(i.key === key && i.status === "removing")));
      }, REMOVE_MS);

      const attempt = async (): Promise<unknown> => {
        try {
          return await api.remove(kind, guild.id, item.id);
        } catch (error) {
          if (!(error instanceof RateLimited)) throw error;
          toast("Waiting on Discord", { description: `Deleting ${cfg.quote(item.name)} in ${Math.ceil(error.retryAfter)}s` });
          await new Promise((r) => setTimeout(r, error.retryAfter * 1000));
          return attempt();
        }
      };
      attempt()
        .then(() => {
          if (item.preview) URL.revokeObjectURL(item.preview);
          toast(`Deleted ${cfg.quote(item.name)}`);
        })
        .catch((error: Error) => {
          setItems((prev) => {
            if (prev.some((i) => i.key === key)) {
              return prev.map((i) => (i.key === key ? { ...i, status: undefined } : i));
            }
            const next = [...prev];
            next.splice(Math.min(index, next.length), 0, { ...item, status: undefined });
            return next;
          });
          toast.error(`Couldn't delete ${cfg.quote(item.name)}`, { description: error.message });
        });
    },
    [guild.id, kind, cfg],
  );

  const askDeleteAll = () =>
    bulk.prepare({
      guildId: guild.id,
      guildName: guild.name,
      kind,
      targets: itemsRef.current
        .filter((i) => i.id && !i.managed && i.status !== "removing")
        .map((i) => ({ key: i.key, id: i.id, name: i.name })),
      skipped: itemsRef.current.filter((i) => i.managed).length,
    });

  useEffect(() => {
    const onCommand = (e: Event) => {
      const cmd = (e as CustomEvent<PageCommand>).detail;
      if (cmd === "upload") uploader.open();
      if (cmd === "delete-all") askDeleteAll();
    };
    window.addEventListener(PAGE_COMMAND, onCommand);
    return () => window.removeEventListener(PAGE_COMMAND, onCommand);
  });

  useEffect(() => {
    setItems((prev) => prev.filter((i) => !i.id || !bulk.wasDeleted(i.id)));
    return bulk.onDeleted((gid, k, id) => {
      if (gid !== guild.id || k !== kind) return;
      setSelectedKey((key) => (itemsRef.current.find((i) => i.key === key)?.id === id ? null : key));
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "removing" } : i)));
      window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), REMOVE_MS);
    });
  }, [guild.id, kind]);

  const openSearch = useCallback(() => {
    commandMenu.open({
      label: `Search ${cfg.plural}`,
      initial: query,
      search: (q) => {
        const needle = q.toLowerCase().replace(/^:|:$/g, "");
        return itemsRef.current
          .filter((i) => i.id && i.status !== "removing")
          .filter((i) => !needle || i.name.toLowerCase().includes(needle) || Boolean(i.tags?.toLowerCase().includes(needle)))
          .slice(0, 40)
          .map((i) => ({
            id: i.key,
            label: cfg.quote(i.name),
            detail: i.animated ? "Animated" : undefined,
            image: i.preview ?? cfg.imageUrl(i, 64) ?? undefined,
          }));
      },
      pick: (key) => {
        setQuery("");
        setVia("pointer");
        setSelectedKey((current) => (current === key ? null : key));
        requestAnimationFrame(() => gridRef.current?.querySelector(`[data-key="${key}"]`)?.scrollIntoView({ block: "nearest" }));
      },
      showAll: (q) => setQuery(q),
    });
  }, [cfg, query]);

  useShortcut("/", openSearch, { description: `Search ${cfg.plural}` });
  useShortcut("escape", () => setSelectedKey(null), {
    description: "Deselect",
    when: () => selectedKey !== null && isDesktop,
  });

  const filterOptions = [
    { value: "all" as const, label: "All" },
    { value: "static" as const, label: "Static" },
    { value: "animated" as const, label: "Animated" },
  ];

  const labelTitle = kind === "sticker" ? "Stickers" : "Emotes";

  return (
    <FileInput
      multiple
      accept={cfg.accept}
      controller={uploader}
      announcement={() => null}
      onValueChange={(_, details) => {
        if (details.reason === "paste" && isEditable(document.activeElement)) {
          details.cancel();
          return;
        }
        if (details.added.length) {
          const batch = [...details.added];
          details.cancel();
          void upload(batch);
        }
      }}
      onReject={() => toast.error(`Use ${cfg.acceptHint}`)}
    >
      <PageHeader icon={kind === "sticker" ? <StickerIcon /> : <SmileIcon />} title={labelTitle} count={counts.all}>
        <SearchButton
          label={`Search ${cfg.plural}`}
          query={query}
          onOpen={openSearch}
          onClear={() => setQuery("")}
          className="flex-1 sm:max-w-56 lg:w-52 lg:flex-none"
        />
        <Segmented size="sm" label={`Filter ${cfg.plural}`} options={filterOptions} value={filter} onChange={setFilter} />
        <div className="ml-auto flex shrink-0 items-center gap-0.5 lg:ml-0">
          <Menu
            onAction={(value) => {
              if (value === "show-progress") bulk.setOpen(true);
              if (value === "delete-all") askDeleteAll();
            }}
          >
            <MenuTrigger aria-label="More actions" className={`${headerButton} w-7 px-0`}>
              <MoreIcon size={16} />
            </MenuTrigger>
            <MenuContent sideOffset={6} align="end" className={popupClass}>
              {busy ? (
                <MenuItem value="show-progress" className={itemClass}>
                  Show progress
                </MenuItem>
              ) : (
                <MenuItem
                  value="delete-all"
                  destructive
                  disabled={!items.some((i) => i.id && !i.managed)}
                  className={`${itemClass} text-danger data-highlighted:bg-danger/10`}
                >
                  <MenuItemIcon>
                    <TrashIcon />
                  </MenuItemIcon>
                  Delete all {cfg.plural}…
                </MenuItem>
              )}
            </MenuContent>
          </Menu>
          <FileInputTrigger controller={uploader} className={headerButton} aria-label={`Upload ${cfg.plural}`}>
            <PlusIcon size={15} />
            <span className="hidden sm:inline">Upload</span>
          </FileInputTrigger>
        </div>
      </PageHeader>

      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col lg:min-h-0">
          <section aria-label={labelTitle} className="emote-scroll min-w-0 flex-1 px-2 pt-3 pb-28 sm:px-3 lg:overflow-y-auto lg:pb-10">
            {counts.all === 0 ? (
              <div className="grid min-h-[50dvh] place-items-center px-6">
                <div className="flex max-w-[280px] flex-col items-center text-center">
                  <span className="grid size-10 place-items-center rounded-[10px] bg-raised text-fg-2">
                    <UploadIcon />
                  </span>
                  <p className="mt-4 text-[14px] font-medium">No {cfg.plural} yet</p>
                  <p className="mt-1 text-fg-2">Drop images here, paste one, or upload from your computer.</p>
                  <div className="mt-5 flex gap-2">
                    <Button variant="quiet" onClick={() => uploader.open()}>
                      Upload {cfg.noun}
                    </Button>
                    {kind === "emote" ? (
                      <Button variant="quiet" render={<Link href={`/servers/${guild.id}/browse`} />}>
                        Browse emotes
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <p className="px-6 py-24 text-center text-fg-2">
                No {cfg.plural} match{query ? <> &ldquo;{query.trim()}&rdquo;</> : " this filter"}.
              </p>
            ) : (
              <TileGrid
                ref={gridRef}
                aria-label={labelTitle}
                value={selectedKey}
                followFocus={selectedKey !== null}
                onValueChange={(next, details) => {
                  setVia(details.source === "keyboard" ? "keyboard" : "pointer");
                  setSelectedKey(typeof next === "string" ? next : null);
                }}
                className={`grid gap-1 ${
                  kind === "sticker"
                    ? "grid-cols-[repeat(auto-fill,minmax(104px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(128px,1fr))]"
                    : "grid-cols-[repeat(auto-fill,minmax(76px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(88px,1fr))]"
                }`}
              >
                {visible.map((item, index) => (
                  <Tile
                    key={item.key}
                    item={item}
                    index={index}
                    fresh={fresh.has(item.key)}
                    selected={item.key === selectedKey}
                    cfg={cfg}
                  />
                ))}
                {!query && filter === "all" ? (
                  <AddTile noun={cfg.noun} large={kind === "sticker"} onClick={() => uploader.open()} />
                ) : null}
              </TileGrid>
            )}
          </section>
        </div>

        <aside
          aria-label="Details"
          data-agent-hidden={!isDesktop ? "" : undefined}
          className="hidden min-h-0 overflow-y-auto border-l border-line [scrollbar-width:thin] lg:block"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={isDesktop && selected ? selected.key : "overview"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.06 } }}
              transition={via === "keyboard" ? { duration: 0 } : { duration: 0.14, ease: "easeOut" }}
            >
              {isDesktop && selected ? (
                <Inspector cfg={cfg} item={selected} onUpdate={update} onDelete={remove} onClose={close} />
              ) : (
                <Overview cfg={cfg} guild={guild} counts={counts} />
              )}
            </motion.div>
          </AnimatePresence>
        </aside>
      </div>

      {!isDesktop ? <Sheet cfg={cfg} item={selected} onUpdate={update} onDelete={remove} onClose={close} /> : null}

      <DropOverlay />
    </FileInput>
  );
}

function Sheet({
  cfg,
  item,
  onUpdate,
  onDelete,
  onClose,
}: {
  cfg: KindConfig;
  item: Item | null;
  onUpdate: (key: string, fields: Fields) => Promise<void>;
  onDelete: (key: string) => void;
  onClose: () => void;
}) {
  const [sheet] = useState(createDrawerController);
  const [cached, setCached] = useState<Item | null>(item);
  if (item && item !== cached) setCached(item);
  const shown = item ?? cached;

  return (
    <Drawer
      side="bottom"
      driver="pointer"
      physics={{ response: 0.26, dampingRatio: 1 }}
      controller={sheet}
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setCached(null);
      }}
    >
      <DrawerBackdrop className="fixed inset-0 z-40 m-0 border-0 bg-black/55 p-0" />
      <DrawerContent
        initialFocus="content"
        className="relative z-50 mx-auto flex h-fit max-h-[88dvh] w-full max-w-[440px] flex-col rounded-t-[20px] border-0 bg-overlay pb-[env(safe-area-inset-bottom)] shadow-(--shadow-float) outline-none"
      >
        <DrawerTitle className="sr-only">{shown ? cfg.quote(shown.name) : "Details"}</DrawerTitle>
        <div aria-hidden className="flex h-5 shrink-0 items-end justify-center">
          <span className="h-1 w-8 rounded-full bg-fg-3/50" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none]">
          {shown ? (
            <Inspector
              key={shown.key}
              cfg={cfg}
              item={shown}
              onUpdate={onUpdate}
              onDelete={(key) => {
                sheet.close();
                onDelete(key);
              }}
              onClose={() => sheet.close()}
              closeAction={
                <DrawerClose
                  aria-label="Close details"
                  className="pressable absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-concentric text-fg-3 transition-[filter,background-color,color] duration-150 [@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg"
                >
                  <CloseIcon size={14} />
                </DrawerClose>
              }
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
