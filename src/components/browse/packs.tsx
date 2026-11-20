"use client";

import { useMemo } from "react";
import { NAME_PATTERN, sanitizeName, uniqueName } from "@/lib/names";
import type { GuildDetail, Pack } from "@/lib/types";
import { Button } from "../button";
import { ArrowUpRightIcon, DownloadIcon, PlusIcon } from "../icons";
import { bulk } from "../manager/bulk";
import { TileGrid, TileGridItem } from "../tile-grid-parts";

type Owned = { name: string; animated: boolean }[];

export function PackGrid({
  packs,
  selected,
  onSelect,
}: {
  packs: Pack[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <TileGrid
      aria-label="Packs"
      value={selected}
      onValueChange={(next) => onSelect(typeof next === "string" ? next : null)}
      className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-2 p-1"
    >
      {packs.map((pack, index) => {
        const animated = pack.items.filter((i) => i.animated).length;
        const noun = pack.kind === "sticker" ? "sticker" : "emote";
        return (
          <li key={pack.id} className="flex min-w-0">
            <TileGridItem
              value={pack.id}
              label={pack.title}
              aria-label={pack.title}
              index={index}
              className="tile group flex h-full w-full flex-col gap-3 rounded-[16px] bg-surface p-2 pb-3 text-left"
            >
              <span className="grid h-[60px] shrink-0 grid-cols-6 place-items-center gap-1 rounded-concentric bg-bg px-2">
                {pack.items.slice(0, 6).map((item) => (
                  <img
                    key={`${item.source}:${item.id}`}
                    src={item.preview}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className={`w-auto max-w-full object-contain ${pack.kind === "sticker" ? "h-9" : "h-7"}`}
                  />
                ))}
              </span>
              <span className="flex min-w-0 flex-1 flex-col px-1">
                <span className="block truncate text-[14px] font-semibold">{pack.title}</span>
                <span className="mt-0.5 line-clamp-2 block h-9 text-[12.5px] leading-[18px] text-fg-2">{pack.tagline}</span>
                <span className="tabular mt-auto block pt-2 text-[12px] text-fg-3">
                  {pack.items.length} {pack.items.length === 1 ? noun : `${noun}s`}
                  {animated && animated < pack.items.length ? ` · ${animated} animated` : ""}
                  {animated === pack.items.length ? " · all animated" : ""}
                </span>
              </span>
            </TileGridItem>
          </li>
        );
      })}
    </TileGrid>
  );
}

export function PackDetails({
  pack,
  guild,
  owned,
  busy,
}: {
  pack: Pack;
  guild: GuildDetail;
  owned: { emote: Owned; sticker: Owned };
  busy: boolean;
}) {
  const mine = owned[pack.kind];
  const taken = useMemo(() => new Set(mine.map((e) => e.name.toLowerCase())), [mine]);

  const toAdd = useMemo(() => pack.items.filter((i) => !taken.has(i.name.toLowerCase())), [pack.items, taken]);
  const skipped = pack.items.length - toAdd.length;

  const room = useMemo(() => {
    if (pack.kind === "sticker") {
      const free = guild.stickerLimit - mine.length;
      return toAdd.length > free ? `Needs ${toAdd.length - free} more sticker slot${toAdd.length - free === 1 ? "" : "s"}` : null;
    }
    const animated = toAdd.filter((i) => i.animated).length;
    const freeAnimated = guild.limit - mine.filter((e) => e.animated).length;
    const freeStatic = guild.limit - mine.filter((e) => !e.animated).length;
    const short = [
      animated > freeAnimated ? `${animated - freeAnimated} animated` : "",
      toAdd.length - animated > freeStatic ? `${toAdd.length - animated - freeStatic} static` : "",
    ].filter(Boolean);
    return short.length ? `Needs ${short.join(" and ")} more slot${short.length > 1 ? "s" : ""}` : null;
  }, [pack.kind, guild, mine, toAdd]);

  const add = () => {
    const names = new Set(taken);
    const targets = toAdd.map((item) => {
      let name: string;
      if (pack.kind === "sticker") {
        name = item.name.slice(0, 30);
      } else {
        name = uniqueName(NAME_PATTERN.test(item.name) ? item.name : sanitizeName(item.name), names);
      }
      names.add(name.toLowerCase());
      return { key: `${item.source}:${item.id}`, id: item.id, name, source: item.source };
    });
    bulk.importNow({ guildId: guild.id, guildName: guild.name, kind: pack.kind, targets });
  };

  const noun = pack.kind === "sticker" ? "sticker" : "emote";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 [scrollbar-width:thin]">
        <div>
          <h2 className="display text-[17px] font-semibold">{pack.title}</h2>
          <p className="mt-1 text-fg-2">{pack.tagline}</p>
        </div>

        <ul className="grid grid-cols-6 gap-1">
          {pack.items.map((item) => {
            const have = taken.has(item.name.toLowerCase());
            return (
              <li
                key={`${item.source}:${item.id}`}
                title={`${item.name}${item.author ? ` · by ${item.author}` : ""}${have ? " · already added" : ""}`}
              >
                <a
                  href={item.page}
                  target="_blank"
                  rel="noreferrer"
                  className="grid aspect-square place-items-center rounded-[8px] bg-bg transition-colors duration-150 hover:bg-raised"
                >
                  <img
                    src={item.preview}
                    alt={item.name}
                    loading="lazy"
                    draggable={false}
                    className={`h-7 w-auto max-w-[80%] object-contain ${have ? "opacity-35" : ""}`}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2.5 text-[13px] leading-[19px] text-fg-2">
          {pack.lore.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        {pack.sources.length ? (
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-fg-3">Sources</span>
            {pack.sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[12px] text-fg-3 hover:text-fg-2"
              >
                <span className="truncate">{s.label}</span>
                <ArrowUpRightIcon size={11} className="shrink-0" />
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-line p-4">
        {skipped || room ? (
          <p className={`mb-2.5 text-[12px] ${room ? "text-danger" : "text-fg-3"}`}>
            {room ?? `${skipped} already in your server will be skipped.`}
          </p>
        ) : null}
        <Button variant="sun" className="w-full" disabled={!toAdd.length || Boolean(room) || busy} onClick={add}>
          <PlusIcon size={15} />
          {toAdd.length ? `Add ${toAdd.length} ${toAdd.length === 1 ? noun : `${noun}s`}` : "All added"}
        </Button>
        <Button
          variant="ghost"
          render={<a href={`/api/packs/${pack.id}/zip`} download />}
          className="mt-2 w-full"
        >
          <DownloadIcon size={15} className="text-fg-3" />
          Download .zip
        </Button>
      </div>
    </div>
  );
}
