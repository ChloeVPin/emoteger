import { emoteDownloadUrl, emoteMarkdown, emoteUrl, stickerDownloadUrl, stickerUrl } from "@/lib/cdn";
import { NAME_PATTERN, sanitizeName, stickerNameFromFile, stickerRules, uniqueName } from "@/lib/names";
import type { AssetKind, GuildDetail } from "@/lib/types";
import { ACCEPT, STICKER_ACCEPT, prepareImage, prepareSticker } from "./prepare";
import type { Item } from "./types";

export type KindConfig = {
  kind: AssetKind;
  noun: string;
  plural: string;
  /** How a name is quoted in messages: `:pog:` for emotes, plain for stickers. */
  quote: (name: string) => string;
  accept: string[];
  acceptHint: string;
  /** Emotes have separate static/animated pools; stickers share one. */
  pooled: boolean;
  limit: (guild: GuildDetail) => number;
  validName: (name: string) => boolean;
  nameHint: string;
  nameFromFile: (file: File, taken: Set<string>) => string;
  /** Spaces become underscores in emote names; sticker names keep them. */
  normalizeName: (value: string) => string;
  prepare: (file: File) => Promise<{ image: string; animated: boolean; format?: 1 | 2 | 4 }>;
  imageUrl: (item: Item, size: number, animated?: boolean) => string | null;
  downloadUrl: (item: Item) => string;
  downloadName: (item: Item) => string;
  markdown?: (item: Item) => string;
};

const FORMAT_EXT = { 1: "png", 2: "png", 3: "json", 4: "gif" } as const;

export const KINDS: Record<AssetKind, KindConfig> = {
  emote: {
    kind: "emote",
    noun: "emote",
    plural: "emotes",
    quote: (n) => `:${n}:`,
    accept: ACCEPT,
    acceptHint: "PNG, JPEG, GIF, WebP or AVIF",
    pooled: false,
    limit: (g) => g.limit,
    validName: (n) => NAME_PATTERN.test(n),
    nameHint: "2–32 letters, numbers or underscores",
    nameFromFile: (f, taken) => uniqueName(sanitizeName(f.name || "emote"), taken),
    normalizeName: (v) => v.replace(/\s/g, "_"),
    prepare: prepareImage,
    imageUrl: (i, size, animated) => emoteUrl(i.id, { size, animated }),
    downloadUrl: (i) => emoteDownloadUrl(i.id, i.animated),
    downloadName: (i) => `${i.name}.${i.animated ? "gif" : "png"}`,
    markdown: (i) => emoteMarkdown(i),
  },
  sticker: {
    kind: "sticker",
    noun: "sticker",
    plural: "stickers",
    quote: (n) => n,
    accept: STICKER_ACCEPT,
    acceptHint: "PNG, APNG or GIF",
    pooled: true,
    limit: (g) => g.stickerLimit,
    validName: stickerRules.name,
    nameHint: "2–30 characters",
    nameFromFile: (f, taken) => {
      const base = stickerNameFromFile(f.name || "Sticker");
      let name = base;
      for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base.slice(0, 30 - String(i).length - 1)} ${i}`;
      return name;
    },
    normalizeName: (v) => v,
    prepare: prepareSticker,
    imageUrl: (i, size) => stickerUrl(i.id, i.format ?? 1, size),
    downloadUrl: (i) => stickerDownloadUrl(i.id, i.format ?? 1),
    downloadName: (i) => `${i.name}.${FORMAT_EXT[i.format ?? 1]}`,
  },
};

export const FORMAT_LABEL = { 1: "PNG", 2: "Animated PNG", 3: "Lottie", 4: "GIF" } as const;
