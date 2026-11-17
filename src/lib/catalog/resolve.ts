import "server-only";
import type { CatalogSource } from "../types";
import { emojiggImage } from "./emojigg";
import { fluentImage } from "./fluent";
import { notoImage } from "./noto";
import { seventvImage } from "./seventv";

/** The best downloadable file(s) for a catalog item, looked up from our own data, never a caller's URL. */
export const resolveCatalogImage = (source: CatalogSource, id: string) =>
  source === "7tv" ? seventvImage(id) : source === "noto" ? notoImage(id) : source === "fluent" ? fluentImage(id) : emojiggImage(id);
