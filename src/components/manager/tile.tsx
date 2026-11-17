"use client";

import { memo, useState } from "react";
import { PlusIcon } from "../icons";
import type { KindConfig } from "./kinds";
import type { Item } from "./types";

const tileClass =
  "tile group relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-tile px-1 pt-2 pb-1.5 outline-offset-0";

const labelClass = "w-full truncate text-center text-[11px] leading-[14px] text-fg-3 transition-colors duration-120";

/** Emote names differ at their ends as often as their starts (pog, pog_2), so cut the middle. */
function middle(name: string, max = 13) {
  if (name.length <= max) return name;
  const head = Math.ceil((max - 1) / 2);
  return `${name.slice(0, head)}…${name.slice(name.length - (max - 1 - head))}`;
}

export const Tile = memo(function Tile({
  item,
  selected,
  index,
  fresh,
  onSelect,
  cfg,
}: {
  item: Item;
  selected: boolean;
  index: number;
  fresh: boolean;
  onSelect: (key: string, via: "pointer" | "keyboard") => void;
  cfg: KindConfig;
}) {
  const [hover, setHover] = useState(false);
  const sticker = cfg.kind === "sticker";
  const uploading = item.status === "uploading";
  const src = item.preview ?? cfg.imageUrl(item, sticker ? 160 : 96);
  // Emotes show a still frame until hovered; sticker files animate on their own.
  const play = !sticker && item.animated && !item.preview && (hover || selected);
  const img = sticker ? "h-20 w-auto max-w-full object-contain" : "h-11 w-auto max-w-[min(100%,96px)] object-contain";

  return (
    <li className="min-w-0">
      <button
        type="button"
        data-key={item.key}
        data-status={item.status}
        title={cfg.quote(item.name)}
        aria-label={cfg.quote(item.name)}
        aria-pressed={selected}
        disabled={uploading}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={(e) => onSelect(item.key, e.detail === 0 ? "keyboard" : "pointer")}
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
          {play ? (
            <img src={cfg.imageUrl(item, 96, true) ?? ""} alt="" draggable={false} className={`absolute ${img}`} />
          ) : null}
          {uploading ? <span aria-hidden className="spinner absolute" /> : null}
        </span>
        <span className={`${labelClass} group-aria-pressed:text-fg`}>{sticker ? item.name : middle(item.name)}</span>
      </button>
    </li>
  );
});

export function AddTile({ onClick, large = false }: { onClick: () => void; large?: boolean }) {
  return (
    <li className="min-w-0">
      <button type="button" onClick={onClick} className={tileClass} aria-label="Upload">
        <span className={`grid w-full place-items-center ${large ? "h-20" : "h-11"}`}>
          <span className="grid size-10 place-items-center rounded-full text-fg-3 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors duration-150 group-hover:text-fg-2">
            <PlusIcon size={16} />
          </span>
        </span>
        <span className={`${labelClass} group-hover:text-fg-2`}>Upload</span>
      </button>
    </li>
  );
}
