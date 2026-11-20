import "server-only";
import type { CatalogSource } from "../types";
import { emojiggImage, emojiggPreview } from "./emojigg";
import { fluentImage, fluentPreview } from "./fluent";
import { notoImage, notoPreview } from "./noto";
import { seventvImage, seventvPreview } from "./seventv";

/** The best downloadable file(s) for a catalog item, looked up from our own data, never a caller's URL. */
export const resolveCatalogImage = (source: CatalogSource, id: string) =>
  source === "7tv" ? seventvImage(id) : source === "noto" ? notoImage(id) : source === "fluent" ? fluentImage(id) : emojiggImage(id);

/** The grid image we'd show for an item, from our own data. */
export const resolveCatalogPreview = async (source: CatalogSource, id: string) =>
  source === "7tv" ? seventvPreview(id) : source === "noto" ? notoPreview(id) : source === "fluent" ? fluentPreview(id) : emojiggPreview(id);
