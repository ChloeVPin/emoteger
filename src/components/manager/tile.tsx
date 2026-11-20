"use client";

import { memo, useState } from "react";
import { Button } from "../button";
import { PlusIcon } from "../icons";
import { TileGridItem } from "../tile-grid-parts";
import type { KindConfig } from "./kinds";
import type { Item } from "./types";

const tileClass =
  "tile group relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-tile px-1 pt-2 pb-1.5 outline-offset-0";

const labelClass = "w-full truncate text-center text-[11px] leading-[14px] text-fg-3 transition-colors duration-120";

export function middle(name: string, max = 13) {
  if (name.length <= max) return name;
  const head = Math.ceil((max - 1) / 2);
  return `${name.slice(0, head)}…${name.slice(name.length - (max - 1 - head))}`;
}

export const Tile = memo(function Tile({
  item,
  selected,
  index,
  fresh,
  cfg,
}: {
  item: Item;
  selected: boolean;
  index: number;
  fresh: boolean;
  cfg: KindConfig;
}) {
  const [hover, setHover] = useState(false);
  const sticker = cfg.kind === "sticker";
  const uploading = item.status === "uploading";
  const src = item.preview ?? cfg.imageUrl(item, sticker ? 160 : 96);
  // Emotes show a still frame until hovered; sticker files animate on their own.
  const play = !sticker && item.animated && !item.preview && (hover || selected);
  const img = sticker ? "h-20 w-auto max-w-full object-contain" : "h-11 w-auto max-w-[min(100%,96px)] object-contain";
  const quoted = cfg.quote(item.name);

  return (
    <li className="min-w-0">
      <TileGridItem
        value={item.key}
        label={quoted}
        index={index}
        disabled={uploading}
        data-key={item.key}
        data-status={item.status}
        title={quoted}
        aria-label={quoted}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className={`${tileClass} ${fresh ? "pop-in" : ""}`}
      >
        <span className={`relative grid w-full place-items-center ${sticker ? "h-20" : "h-11"}`}>
          {!src ? (
            <span className="grid size-16 place-items-center rounded-[10px] bg-raised text-[11px] font-medium text-fg-3">Lottie</span>
          ) : (
            <img
              src={src}
              alt=""
              loading={index < 64 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className={`${img} transition-opacity duration-200 ${uploading ? "opacity-40" : ""} ${
                item.available ? "" : "opacity-40 grayscale"
              } ${play ? "invisible" : ""}`}
            />
          )}
          {play ? <img src={cfg.imageUrl(item, 96, true) ?? ""} alt="" draggable={false} className={`absolute ${img}`} /> : null}
          {uploading ? <span aria-hidden className="spinner absolute" /> : null}
        </span>
        <span className={`${labelClass} group-aria-pressed:text-fg group-data-pressed:text-fg`}>
          {sticker ? item.name : middle(item.name)}
        </span>
      </TileGridItem>
    </li>
  );
});

export function AddTile({ onClick, noun, large = false }: { onClick: () => void; noun: string; large?: boolean }) {
  return (
    <li className="min-w-0">
      <Button
        variant="ghost"
        onClick={onClick}
        aria-label={`Add ${noun}`}
        className={`${tileClass} !h-auto !bg-transparent !font-normal`}
      >
        <span className={`grid w-full place-items-center ${large ? "h-20" : "h-11"}`}>
          <span className="grid size-10 place-items-center rounded-full text-fg-3 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors duration-150 group-hover:text-fg-2">
            <PlusIcon size={16} />
          </span>
        </span>
        <span className={`${labelClass} group-hover:text-fg-2`}>Upload</span>
      </Button>
    </li>
  );
}
