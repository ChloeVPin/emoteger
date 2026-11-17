import "server-only";
import type { CatalogItem, CatalogPage } from "../types";
import { diskJson } from "./disk";

/*
  Google's Noto Animated Emoji: ~900 animated emoji with an official public index.
  Licensed CC BY 4.0 (https://googlefonts.github.io/noto-emoji-animation/).
*/

const INDEX = "https://googlefonts.github.io/noto-emoji-animation/data/api.json";
const ASSET = "https://fonts.gstatic.com/s/e/notoemoji/latest";
const PAGE = 60;

type Raw = { icons: { codepoint: string; popularity: number; categories: string[]; tags: string[] }[] };
type Entry = { codepoint: string; popularity: number; category: string; tags: string[]; name: string; lower: string };

const title = (s: string) => s.replace(/[:_-]+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

let entries: Promise<Entry[]> | null = null;
function load() {
  entries ??= diskJson<Raw>("noto-index", INDEX, 7 * 24 * 60 * 60 * 1000).then((raw) =>
    raw.icons
      .map((i) => {
        const tags = i.tags.map((t) => t.replace(/:/g, ""));
        const name = title(tags[0] ?? i.codepoint).slice(0, 30);
        return { codepoint: i.codepoint, popularity: i.popularity, category: i.categories[0] ?? "", tags, name, lower: `${tags.join(" ")} ${i.categories.join(" ")}`.toLowerCase() };
      })
      .sort((a, b) => b.popularity - a.popularity),
  );
  entries.catch(() => (entries = null));
  return entries;
}

const glyph = (codepoint: string) => String.fromCodePoint(...codepoint.split("_").map((c) => parseInt(c, 16)));

const toItem = (e: Entry): CatalogItem => ({
  source: "noto",
  id: e.codepoint,
  name: e.name,
  animated: true,
  // The static SVG keeps the grid light; the animation plays on hover.
  preview: `${ASSET}/${e.codepoint}/emoji.svg`,
  animatedPreview: `${ASSET}/${e.codepoint}/512.webp`,
  // Credited by source name ("on Google Noto"); a separate author would just repeat it.
  author: null,
  page: "https://googlefonts.github.io/noto-emoji-animation/",
});

export async function searchNoto(opts: { q: string; animated: boolean | null; page: number }): Promise<CatalogPage> {
  if (opts.animated === false) return { items: [], nextPage: null };
  const q = opts.q.trim().toLowerCase();
  const list = (await load()).filter((e) => !q || e.lower.includes(q));
  const start = (opts.page - 1) * PAGE;
  return { items: list.slice(start, start + PAGE).map(toItem), nextPage: start + PAGE < list.length ? opts.page + 1 : null };
}

export async function notoImage(id: string) {
  if (!/^[0-9a-f]{4,6}(_[0-9a-f]{2,6})*$/.test(id)) return null;
  const e = (await load()).find((x) => x.codepoint === id);
  if (!e) return null;
  return { name: e.name, animated: true, glyph: glyph(id), urls: [`${ASSET}/${id}/512.gif`] };
}

export const notoPreview = (id: string) => (/^[0-9a-f]{4,6}(_[0-9a-f]{2,6})*$/.test(id) ? `${ASSET}/${id}/emoji.svg` : null);
