import type { AssetKind, StickerFormat } from "@/lib/types";

/** One emote or sticker in the library. Sticker-only fields are optional. */
export type Item = {
  id: string;
  name: string;
  animated: boolean;
  available: boolean;
  managed: boolean;
  addedBy: { id: string; name: string } | null;
  description?: string;
  tags?: string;
  format?: StickerFormat;
  /** Stable React key; survives the pending → created transition. */
  key: string;
  /** Local object URL used while uploading and after, to avoid a reload flash. */
  preview?: string;
  status?: "uploading" | "removing";
};

export type Filter = "all" | "static" | "animated";

export type Fields = Partial<{ name: string; description: string; tags: string }>;

export type { AssetKind };
