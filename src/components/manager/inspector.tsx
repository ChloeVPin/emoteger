"use client";

import { useState } from "react";
import { toast } from "sonner";
import { stickerRules } from "@/lib/names";
import { CloseIcon, CopyIcon, DownloadIcon, LinkIcon } from "../icons";
import { SwapIcon, copyText, quietButton, useFlash } from "./copy-button";
import { HoldToDelete } from "./hold-button";
import { FORMAT_LABEL, type KindConfig } from "./kinds";
import type { Fields, Item } from "./types";

async function download(cfg: KindConfig, item: Item) {
  try {
    const res = await fetch(cfg.downloadUrl(item));
    if (!res.ok) throw new Error();
    const href = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href, download: cfg.downloadName(item) });
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    toast.error("Couldn't download");
  }
}

function status(item: Item) {
  if (item.managed) return "Managed by an integration";
  if (!item.available) return "Unavailable until boosted";
  return null;
}

/** A detail row. When `copy` is set the whole row copies its value and confirms with a check. */
function Row({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: string }) {
  const [done, flash] = useFlash();
  const content = (
    <>
      <dt className="w-[76px] shrink-0 text-left text-fg-3">{label}</dt>
      <dd title={value} className={`min-w-0 flex-1 truncate text-left text-fg ${mono ? "font-mono text-[12px]" : ""}`}>
        {value}
      </dd>
      {copy !== undefined ? (
        <span
          data-done={done || undefined}
          className="text-fg-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 data-[done]:opacity-100"
        >
          <SwapIcon done={done} icon={<CopyIcon size={14} />} />
        </span>
      ) : null}
    </>
  );
  const shape = "flex h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2";
  return copy !== undefined ? (
    <button
      type="button"
      aria-label={`Copy ${label.toLowerCase()}`}
      onClick={() => copyText(copy, flash)}
      className={`${shape} group pressable transition-[filter,background-color] duration-150 [@media(hover:hover)]:hover:bg-hover`}
    >
      {content}
    </button>
  ) : (
    <div className={shape}>{content}</div>
  );
}

/** An inline-editable detail row that saves on blur or Enter and reverts on Escape. */
function EditRow({
  label,
  value,
  placeholder,
  valid,
  hint,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  valid: (v: string) => boolean;
  hint: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const ok = valid(draft);
  const save = async () => {
    if (draft.trim() === value) return setDraft(value);
    if (!ok) return setDraft(value);
    try {
      await onSave(draft.trim());
    } catch {
      setDraft(value);
    }
  };
  return (
    <div className="flex min-h-8 w-full min-w-0 items-start gap-2 px-2">
      <dt className="w-[76px] shrink-0 pt-[7px] text-fg-3">{label}</dt>
      <dd className="min-w-0 flex-1">
        <input
          value={draft}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={!ok}
          title={!ok ? hint : draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              const input = e.currentTarget;
              e.stopPropagation();
              setDraft(value);
              requestAnimationFrame(() => input.blur());
            }
          }}
          style={{ outline: "none" }}
          className="-mx-1.5 h-8 w-[calc(100%+0.75rem)] rounded-[6px] bg-transparent px-1.5 text-ellipsis text-fg transition-[background-color,box-shadow] duration-150 placeholder:text-fg-3 hover:bg-hover focus:bg-raised focus:shadow-[inset_0_0_0_1.5px_var(--color-sun)] aria-invalid:shadow-[inset_0_0_0_1.5px_var(--color-danger)]"
        />
        {!ok ? <p className="pb-1 text-[12px] text-danger">{hint}</p> : null}
      </dd>
    </div>
  );
}

export function Inspector({
  cfg,
  item,
  onUpdate,
  onDelete,
  onClose,
}: {
  cfg: KindConfig;
  item: Item;
  onUpdate: (key: string, fields: Fields) => Promise<void>;
  onDelete: (key: string) => void;
  onClose: () => void;
}) {
  // The parent keys this component by item, so the draft resets per emote.
  const [draft, setDraft] = useState(item.name);
  const [saving, setSaving] = useState(false);
  const [linkCopied, flashLink] = useFlash();
  const valid = cfg.validName(draft);
  const sticker = cfg.kind === "sticker";
  const src = item.preview ?? cfg.imageUrl(item, sticker ? 320 : 256, item.animated);
  const dirty = draft !== item.name;
  const locked = item.managed || !item.id;
  const note = status(item);

  const commit = async () => {
    if (!dirty || saving) return;
    if (!valid) {
      setDraft(item.name);
      return;
    }
    setSaving(true);
    try {
      await onUpdate(item.key, { name: sticker ? draft.trim() : draft });
    } catch {
      setDraft(item.name);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="relative grid aspect-[4/3] max-h-[200px] w-full place-items-center overflow-hidden rounded-[12px] bg-surface">
        {src ? (
          <img
            src={src}
            alt={cfg.quote(item.name)}
            draggable={false}
            className={`${sticker ? "h-36" : "h-24"} w-auto max-w-[78%] object-contain ${item.available ? "" : "opacity-50 grayscale"}`}
          />
        ) : (
          <span className="text-fg-3">Lottie animations can&rsquo;t be previewed here</span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="pressable absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-concentric text-fg-3 transition-[filter,background-color,color] duration-150 [@media(hover:hover)]:hover:bg-hover [@media(hover:hover)]:hover:text-fg"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      <div className="relative mt-4">
        <label htmlFor="emote-name" className="sr-only">
          Name
        </label>
        <input
          id="emote-name"
          value={draft}
          title={draft}
          disabled={locked}
          maxLength={sticker ? 30 : 32}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-invalid={dirty && !valid}
          onChange={(e) => setDraft(cfg.normalizeName(e.target.value))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              const input = e.currentTarget;
              e.stopPropagation();
              setDraft(item.name);
              requestAnimationFrame(() => input.blur());
            }
          }}
          style={{ outline: "none" }}
          className="display -mx-2 h-8 w-[calc(100%+1rem)] rounded-[8px] bg-transparent px-2 pr-8 text-[15px] font-semibold text-ellipsis transition-[background-color,box-shadow] duration-150 enabled:hover:bg-hover focus:bg-raised focus:shadow-[inset_0_0_0_1.5px_var(--color-sun)] aria-invalid:shadow-[inset_0_0_0_1.5px_var(--color-danger)]"
        />
        {saving ? <span aria-hidden className="spinner absolute top-4 right-0 !size-3.5 -translate-y-1/2" /> : null}
        {dirty && !valid ? (
          <p className="mt-1 text-[12px] text-danger">{cfg.nameHint}</p>
        ) : note ? (
          <p className="mt-1 text-[12px] text-fg-3">{note}</p>
        ) : null}
      </div>

      <dl className="-mx-2 mt-3 flex flex-col">
        {sticker && item.id ? (
          <>
            <EditRow
              label="Description"
              value={item.description ?? ""}
              placeholder="Add a description"
              valid={stickerRules.description}
              hint="Empty or 2–100 characters"
              onSave={(description) => onUpdate(item.key, { description })}
            />
            <EditRow
              label="Emoji"
              value={item.tags ?? ""}
              placeholder="Related emoji or word"
              valid={stickerRules.tags}
              hint="Add a related emoji or word"
              onSave={(tags) => onUpdate(item.key, { tags })}
            />
          </>
        ) : null}
        <Row label="Type" value={sticker ? FORMAT_LABEL[item.format ?? 1] : item.animated ? "Animated" : "Static"} />
        {item.addedBy ? <Row label="Added by" value={item.addedBy.name} /> : null}
        {item.id && cfg.markdown ? <Row label="Markdown" value={cfg.markdown(item)} mono copy={cfg.markdown(item)} /> : null}
        {item.id ? <Row label="ID" value={item.id} mono copy={item.id} /> : null}
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" disabled={!item.id} onClick={() => copyText(cfg.downloadUrl(item), flashLink)} className={quietButton}>
          <SwapIcon done={linkCopied} icon={<LinkIcon size={15} className="text-fg-3" />} />
          <span className="truncate">Copy link</span>
        </button>
        <button type="button" disabled={!item.id} onClick={() => download(cfg, item)} className={quietButton}>
          <DownloadIcon size={15} className="shrink-0 text-fg-3" />
          <span className="truncate">Download</span>
        </button>
      </div>

      <div className="mt-2">
        <HoldToDelete disabled={locked} onConfirm={() => onDelete(item.key)} />
      </div>
    </div>
  );
}
