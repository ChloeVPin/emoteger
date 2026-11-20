"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { toast } from "@ui-sdk/react/toast";
import { useState } from "react";
import { stickerRules } from "@/lib/names";
import { Button } from "../button";
import { CloseIcon, CopyIcon, DownloadIcon, LinkIcon } from "../icons";
import { SwapIcon, copyText, useFlash } from "./copy-button";
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

function Row({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: string }) {
  const [done, flash] = useFlash();
  const content = (
    <>
      <span className="w-[76px] shrink-0 text-left font-normal text-fg-3">{label}</span>
      <span title={value} className={`min-w-0 flex-1 truncate text-left font-normal text-fg ${mono ? "font-mono text-[12px]" : ""}`}>
        {value}
      </span>
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
    <Button
      variant="ghost"
      aria-label={`Copy ${label.toLowerCase()}, ${value}`}
      onClick={() => copyText(copy, flash)}
      className={`${shape} group !justify-start !px-2 !text-[13px]`}
    >
      {content}
    </Button>
  ) : (
    <div className={shape}>{content}</div>
  );
}

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
  const save = async (next = draft) => {
    if (next.trim() === value) return setDraft(value);
    if (!valid(next)) return setDraft(value);
    try {
      await onSave(next.trim());
    } catch {
      setDraft(value);
    }
  };
  return (
    <Field invalid={!ok ? true : undefined} className="flex min-h-8 w-full min-w-0 items-start gap-2 px-2">
      <FieldLabel className="w-[76px] shrink-0 pt-[7px] text-fg-3">{label}</FieldLabel>
      <div className="min-w-0 flex-1">
        <Input
          value={draft}
          placeholder={placeholder}
          title={!ok ? hint : draft}
          onValueChange={(next, details) => {
            if (details.source === "agent") {
              if (!valid(next)) {
                details.cancel();
                return;
              }
              setDraft(next);
              void save(next);
              return;
            }
            setDraft(next);
          }}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              const input = e.currentTarget;
              e.stopPropagation();
              setDraft(value);
              requestAnimationFrame(() => input.blur());
            }
          }}
          className="-mx-1.5 h-8 w-[calc(100%+0.75rem)] rounded-[6px] bg-transparent px-1.5 text-ellipsis text-fg transition-[background-color,box-shadow] duration-150 placeholder:text-fg-3 hover:bg-hover focus:bg-raised focus:shadow-[inset_0_0_0_1.5px_var(--color-sun)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_1.5px_var(--color-danger)]"
        />
        {!ok ? (
          <FieldError match className="pb-1 text-[12px] text-danger">
            {hint}
          </FieldError>
        ) : null}
      </div>
    </Field>
  );
}

export function Inspector({
  cfg,
  item,
  onUpdate,
  onDelete,
  onClose,
  closeAction,
}: {
  cfg: KindConfig;
  item: Item;
  onUpdate: (key: string, fields: Fields) => Promise<void>;
  onDelete: (key: string) => void;
  onClose: () => void;
  closeAction?: React.ReactNode;
}) {
  const [draft, setDraft] = useState(item.name);
  const [saving, setSaving] = useState(false);
  const [linkCopied, flashLink] = useFlash();
  const valid = cfg.validName(draft);
  const sticker = cfg.kind === "sticker";
  const src = item.preview ?? cfg.imageUrl(item, sticker ? 320 : 256, item.animated);
  const dirty = draft !== item.name;
  const locked = item.managed || !item.id;
  const note = status(item);

  const commit = async (next = draft) => {
    if (next === item.name || saving) return;
    if (!cfg.validName(next)) {
      setDraft(item.name);
      return;
    }
    setSaving(true);
    try {
      await onUpdate(item.key, { name: sticker ? next.trim() : next });
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
        {closeAction ?? (
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close details"
            className="absolute top-1.5 right-1.5 !size-7 !rounded-concentric !p-0 text-fg-3"
          >
            <CloseIcon size={14} />
          </Button>
        )}
      </div>

      <Field disabled={locked} invalid={dirty && !valid ? true : undefined} className="relative mt-4">
        <FieldLabel className="sr-only">Name</FieldLabel>
        <Input
          value={draft}
          title={draft}
          maxLength={sticker ? 30 : 32}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          onValueChange={(raw, details) => {
            const next = cfg.normalizeName(raw);
            if (details.source === "agent") {
              if (!cfg.validName(next)) {
                details.cancel();
                return;
              }
              setDraft(next);
              void commit(next);
              return;
            }
            setDraft(next);
          }}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              const input = e.currentTarget;
              e.stopPropagation();
              setDraft(item.name);
              requestAnimationFrame(() => input.blur());
            }
          }}
          className="display -mx-2 h-8 w-[calc(100%+1rem)] rounded-[8px] bg-transparent px-2 pr-8 text-[15px] font-semibold text-ellipsis transition-[background-color,box-shadow] duration-150 enabled:hover:bg-hover focus:bg-raised focus:shadow-[inset_0_0_0_1.5px_var(--color-sun)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_1.5px_var(--color-danger)]"
        />
        {saving ? <span aria-hidden className="spinner absolute top-4 right-0 !size-3.5 -translate-y-1/2" /> : null}
        {dirty && !valid ? (
          <FieldError match className="mt-1 text-[12px] text-danger">
            {cfg.nameHint}
          </FieldError>
        ) : note ? (
          <FieldDescription className="mt-1 text-[12px] text-fg-3">{note}</FieldDescription>
        ) : null}
      </Field>

      <div className="-mx-2 mt-3 flex flex-col">
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
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant="quiet"
          disabled={!item.id}
          onClick={() => copyText(cfg.downloadUrl(item), flashLink)}
          className="min-w-0"
        >
          <SwapIcon done={linkCopied} icon={<LinkIcon size={15} className="text-fg-3" />} />
          <span className="truncate">Copy link</span>
        </Button>
        <Button
          variant="quiet"
          disabled={!item.id}
          pendingAnnouncement="Downloading"
          onClick={() => download(cfg, item)}
          className="min-w-0"
        >
          <DownloadIcon size={15} className="shrink-0 text-fg-3" />
          <span className="truncate">Download</span>
        </Button>
      </div>

      <div className="mt-2">
        <HoldToDelete
          disabled={locked}
          confirm={`Deletes ${cfg.quote(item.name)}`}
          onConfirm={() => onDelete(item.key)}
        />
      </div>
    </div>
  );
}
