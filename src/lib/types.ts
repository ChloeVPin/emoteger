export type Emote = {
  id: string;
  name: string;
  animated: boolean;
  available: boolean;
  managed: boolean;
  addedBy: { id: string; name: string } | null;
};

export type GuildSummary = {
  id: string;
  name: string;
  icon: string | null;
  botInstalled: boolean;
};

/** Discord sticker formats: 1 PNG, 2 APNG, 3 Lottie, 4 GIF. */
export type StickerFormat = 1 | 2 | 3 | 4;

export type Sticker = {
  id: string;
  name: string;
  description: string;
  /** Discord's "related emoji" autocomplete tags. */
  tags: string;
  format: StickerFormat;
  animated: boolean;
  available: boolean;
  managed: false;
  addedBy: { id: string; name: string } | null;
};

export type AssetKind = "emote" | "sticker";

export type GuildDetail = {
  id: string;
  name: string;
  icon: string | null;
  /** Emote slots per type (static and animated each). */
  limit: number;
  /** Sticker slots, one shared pool. */
  stickerLimit: number;
};

export type CatalogSource = "emojigg" | "7tv" | "noto" | "fluent";

/** Which Discord asset a catalog fills: emote sources vs. sticker sources. */
export const SOURCE_KIND: Record<CatalogSource, AssetKind> = { emojigg: "emote", "7tv": "emote", noto: "sticker", fluent: "sticker" };

export const isCatalogSource = (value: unknown): value is CatalogSource =>
  typeof value === "string" && Object.hasOwn(SOURCE_KIND, value);

export type CatalogItem = {
  source: CatalogSource;
  id: string;
  name: string;
  animated: boolean;
  /** Small image for the grid. */
  preview: string;
  /** Optional animated version, played on hover (for sources whose grid image is a still). */
  animatedPreview?: string;
  author: string | null;
  /** The emote's page on its source site, for credit. */
  page: string;
};

export type CatalogPage = { items: CatalogItem[]; nextPage: number | null };

export type CatalogCategory = { id: string; name: string; count?: number; /** Requires 18+ confirmation. */ adult?: boolean };

export type Pack = {
  id: string;
  title: string;
  kind: AssetKind;
  /** One line under the title. */
  tagline: string;
  /** Origin and usage notes shown in the pack panel. */
  lore: string[];
  /** Where the lore comes from. */
  sources: { label: string; url: string }[];
  items: CatalogItem[];
};
