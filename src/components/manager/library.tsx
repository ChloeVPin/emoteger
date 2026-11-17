"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { SessionUser } from "@/lib/session";
import type { AssetKind, GuildDetail } from "@/lib/types";
import Link from "next/link";
import { Button, buttonClass } from "../button";
import { PAGE_COMMAND, type PageCommand, SearchButton, commandMenu } from "../command-menu";
import { MoreIcon, PlusIcon, SmileIcon, StickerIcon, TrashIcon, UploadIcon } from "../icons";
import { PageHeader, headerButton } from "../page-header";
import { Menu, itemClass, popupClass } from "../menu";
import { RateLimited, api } from "./api";
import { DropOverlay } from "./drop-overlay";
import { Inspector } from "./inspector";
import { Overview } from "./overview";
import { bulk, useBulk } from "./bulk";
import { KINDS, type KindConfig } from "./kinds";
import { Segmented } from "./segmented";
import { AddTile, Tile } from "./tile";
import type { Fields, Filter, Item } from "./types";
import { useMediaQuery } from "./use-media-query";

const REMOVE_MS = 180;

const isEditable = (el: EventTarget | null) =>
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
  const [dragging, setDragging] = useState(false);
  const [fresh] = useState(() => new Set<string>());
  const deferredQuery = useDeferredValue(query);
  const deferredFilter = useDeferredValue(filter);

  const itemsRef = useRef(items);
  const fileInput = useRef<HTMLInputElement>(null);
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

  const select = useCallback((key: string, how: "pointer" | "keyboard") => {
    setVia(how);
    setSelectedKey((current) => (current === key && how === "pointer" ? null : key));
  }, []);

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

      const jobs: { key: string; name: string; image: string }[] = [];
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
        jobs.push({ key, name, image: prepared.image });
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
          preview: URL.createObjectURL(file),
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
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
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
          toast(`Waiting on Discord`, { description: `Deleting ${cfg.quote(item.name)} in ${Math.ceil(error.retryAfter)}s` });
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

  // Actions requested from the ⌘K menu.
  useEffect(() => {
    const onCommand = (e: Event) => {
      const cmd = (e as CustomEvent<PageCommand>).detail;
      if (cmd === "upload") fileInput.current?.click();
      if (cmd === "delete-all") askDeleteAll();
    };
    window.addEventListener(PAGE_COMMAND, onCommand);
    return () => window.removeEventListener(PAGE_COMMAND, onCommand);
  });

  // A bulk job may outlive this page: drop what it already deleted, and follow along live.
  useEffect(() => {
    setItems((prev) => prev.filter((i) => !i.id || !bulk.wasDeleted(i.id)));
    return bulk.onDeleted((gid, k, id) => {
      if (gid !== guild.id || k !== kind) return;
      setSelectedKey((key) => (itemsRef.current.find((i) => i.key === key)?.id === id ? null : key));
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "removing" } : i)));
      window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), REMOVE_MS);
    });
  }, [guild.id, kind]);

  // The header search opens the command menu scoped to this library.
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
        select(key, "pointer");
        requestAnimationFrame(() => gridRef.current?.querySelector(`[data-key="${key}"]`)?.scrollIntoView({ block: "nearest" }));
      },
      showAll: (q) => setQuery(q),
    });
  }, [cfg, query, select]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !isEditable(e.target)) {
        e.preventDefault();
        openSearch();
      } else if (e.key === "Escape" && !isEditable(e.target)) {
        setSelectedKey(null);
      }
    };

    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      void upload([...(e.dataTransfer?.files ?? [])]);
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isEditable(e.target)) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        void upload(files);
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [upload, openSearch]);

  /** Arrow keys move through the grid; selection follows focus once something is open. */
  const onGridKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    const grid = gridRef.current;
    if (!grid || !(e.target instanceof HTMLButtonElement)) return;
    const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const delta = deltas[e.key] ?? (e.key === "ArrowUp" ? -columns : e.key === "ArrowDown" ? columns : 0);
    if (!delta) return;
    e.preventDefault();
    const buttons = [...grid.querySelectorAll<HTMLButtonElement>("button[data-key]")];
    const next = buttons[buttons.indexOf(e.target) + delta];
    if (!next) return;
    next.focus({ preventScroll: false });
    if (selectedKey) select(next.dataset.key!, "keyboard");
  };

  const filterOptions = [
    { value: "all" as const, label: "All" },
    { value: "static" as const, label: "Static" },
    { value: "animated" as const, label: "Animated" },
  ];

  const search = (
    <SearchButton
      label={`Search ${cfg.plural}`}
      query={query}
      onOpen={openSearch}
      onClear={() => setQuery("")}
      className="flex-1 sm:max-w-56 lg:w-52 lg:flex-none"
    />
  );

  return (
    <>
      <PageHeader icon={kind === "sticker" ? <StickerIcon /> : <SmileIcon />} title={kind === "sticker" ? "Stickers" : "Emotes"} count={counts.all}>
        {search}
        <Segmented size="sm" label={`Filter ${cfg.plural}`} options={filterOptions} value={filter} onChange={setFilter} />
        <div className="ml-auto flex shrink-0 items-center gap-0.5 lg:ml-0">
          <Menu.Root>
            <Menu.Trigger aria-label="More actions" className={`${headerButton} w-7 px-0`}>
              <MoreIcon size={16} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={6} align="end" className="z-50">
                <Menu.Popup className={popupClass}>
                  {busy ? (
                    <Menu.Item onClick={() => bulk.setOpen(true)} className={itemClass}>
                      Show progress
                    </Menu.Item>
                  ) : (
                    <Menu.Item
                      disabled={!items.some((i) => i.id && !i.managed)}
                      onClick={askDeleteAll}
                      className={`${itemClass} text-danger data-highlighted:bg-danger/10`}
                    >
                      <TrashIcon />
                      Delete all {cfg.plural}…
                    </Menu.Item>
                  )}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <button type="button" onClick={() => fileInput.current?.click()} className={headerButton} aria-label={`Upload ${cfg.plural}`}>
            <PlusIcon size={15} />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </PageHeader>

      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col lg:min-h-0">
          {/* Desktop: the grid is the only thing that scrolls, so the scrollbar lives beside it. */}
          <section aria-label="Emotes" className="emote-scroll min-w-0 flex-1 px-2 pt-3 pb-28 sm:px-3 lg:overflow-y-auto lg:pb-10">
            {counts.all === 0 ? (
              <div className="grid min-h-[50dvh] place-items-center px-6">
                <div className="flex max-w-[280px] flex-col items-center text-center">
                  <span className="grid size-10 place-items-center rounded-[10px] bg-raised text-fg-2">
                    <UploadIcon />
                  </span>
                  <p className="mt-4 text-[14px] font-medium">No {cfg.plural} yet</p>
                  <p className="mt-1 text-fg-2">Drop images here, paste one, or upload from your computer.</p>
                  <div className="mt-5 flex gap-2">
                    <Button variant="quiet" onClick={() => fileInput.current?.click()}>
                      Upload
                    </Button>
                    {kind === "emote" ? (
                      <Link href={`/servers/${guild.id}/browse`} className={buttonClass("quiet")}>
                        Browse emotes
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <p className="px-6 py-24 text-center text-fg-2">
                No {cfg.plural} match{query ? <> &ldquo;{query.trim()}&rdquo;</> : " this filter"}.
              </p>
            ) : (
              <ul
                ref={gridRef}
                onKeyDown={onGridKey}
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
                    onSelect={select}
                    cfg={cfg}
                  />
                ))}
                {!query && filter === "all" ? <AddTile large={kind === "sticker"} onClick={() => fileInput.current?.click()} /> : null}
              </ul>
            )}
          </section>
        </div>

        <aside aria-label="Details" className="hidden min-h-0 overflow-y-auto border-l border-line [scrollbar-width:thin] lg:block">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={selected ? selected.key : "overview"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.06 } }}
              transition={via === "keyboard" ? { duration: 0 } : { duration: 0.14, ease: "easeOut" }}
            >
              {selected ? (
                <Inspector cfg={cfg} item={selected} onUpdate={update} onDelete={remove} onClose={close} />
              ) : (
                <Overview cfg={cfg} guild={guild} counts={counts} />
              )}
            </motion.div>
          </AnimatePresence>
        </aside>
      </div>

      {!isDesktop ? <Sheet cfg={cfg} item={selected} onUpdate={update} onDelete={remove} onClose={close} /> : null}

      <DropOverlay show={dragging} />

      <input
        ref={fileInput}
        type="file"
        multiple
        accept={cfg.accept.join(",")}
        className="hidden"
        onChange={(e) => {
          void upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </>
  );
}

/** Small screens: the inspector rises as a sheet that follows the finger and can be flicked away. */
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
  const controls = useDragControls();
  return (
    <AnimatePresence>
      {item ? (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/55"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-label={cfg.quote(item.name)}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.36 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.9 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[20px] bg-overlay pb-[env(safe-area-inset-bottom)] shadow-(--shadow-float) [scrollbar-width:none]"
          >
            <div
              onPointerDown={(e) => controls.start(e)}
              className="sticky top-0 z-10 flex h-5 cursor-grab touch-none items-end justify-center bg-overlay"
            >
              <span className="h-1 w-8 rounded-full bg-fg-3/50" />
            </div>
            <Inspector key={item.key} cfg={cfg} item={item} onUpdate={onUpdate} onDelete={onDelete} onClose={onClose} />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
