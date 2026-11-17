import "server-only";
import type { CatalogCategory, CatalogItem, CatalogPage } from "../types";
import { diskJson } from "./disk";
import { animatedOf, ensureHealthLoaded, isDead, sweep } from "./health";

/*
  emoji.gg publishes its whole catalog as one JSON file (~2 MB, ~5k emotes), so we keep a
  copy in memory for a few hours and search it locally: instant results, one upstream call.
*/

const API = "https://emoji.gg/api/";
const TTL = 6 * 60 * 60 * 1000;
const NSFW_CATEGORY = 9;
const PAGE = 60;

/*
  Two lists, by name:
  - NEVER: removed from every view, including NSFW. Anything sexualising minors, slurs, hate
    symbols and self-harm. Hidden even in the NSFW category.
  - ADULT: sexual terms. emoji.gg's own NSFW category misses many of these (they sit in Anime,
    Meme, Other), so they're moved into NSFW, which only shows after an 18+ confirmation.
  Both are heuristics and err toward hiding.
*/
const NEVER = new RegExp(
  [
    "loli", "shota", "\\bchild", "\\bkids?\\b", "\\bminor", "underage", "\\bteen", "\\bcp\\b", "\\brape",
    "\\bnig", "fag", "retard", "nazi", "swastika", "kkk", "trap", "\\bkys\\b", "kms\\b", "suicide",
  ].join("|"),
  "i",
);
const ADULT = new RegExp(
  [
    "hentai", "ahegao", "lewd", "nsfw", "porn", "sex", "nude", "naked", "boob", "tit(s|ty|ties)\\b", "booty",
    "butts?\\b", "\\bass\\b", "thot", "horny", "\\bcum", "dick", "cock", "penis", "pussy", "vagina", "eggplant",
    "milf", "bdsm", "fetish", "thicc", "slut", "whore",
  ].join("|"),
  "i",
);

type Raw = {
  id: number;
  title: string;
  slug: string;
  image: string;
  category: number;
  faves: number;
  submitted_by: string;
};

type Entry = CatalogItem & { image: string; category: number; faves: number; lower: string; adult: boolean };

let cache: { at: number; entries: Promise<Entry[]>; categories: Promise<CatalogCategory[]> } | null = null;

function load() {
  if (cache && Date.now() - cache.at < TTL) return cache;
  const entries = diskJson<Raw[]>("emojigg/catalog", API, TTL).then((raw) =>
    raw
      .filter((e) => !NEVER.test(e.title) && !NEVER.test(e.slug) && /^https:\/\/cdn\d*\.emoji\.gg\//.test(e.image))
      .map(
        (e): Entry => ({
          source: "emojigg",
          id: String(e.id),
          name: e.title,
          animated: e.image.endsWith(".gif"),
          preview: e.image,
          image: e.image,
          author: e.submitted_by || null,
          page: `https://emoji.gg/emoji/${e.slug}`,
          category: e.category,
          faves: e.faves ?? 0,
          lower: e.title.toLowerCase(),
          adult: e.category === NSFW_CATEGORY || ADULT.test(e.title) || ADULT.test(e.slug),
        }),
      ),
  );
  const categories = diskJson<Record<string, string>>("emojigg/categories", `${API}?request=categories`, TTL).then((map) =>
    Object.entries(map)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  cache = { at: Date.now(), entries, categories };
  // Check images in the background, most-loved first, since those are what people see first.
  entries
    .then((list) =>
      sweep([...list].sort((a, b) => b.faves - a.faves).map((e) => ({ key: `emojigg:${e.id}`, url: e.image }))),
    )
    .catch(() => {});
  // A failure shouldn't stick for six hours; let the next request try again.
  Promise.all([entries, categories]).catch(() => (cache = null));
  return cache;
}

/**
 * emoji.gg names 23 categories but its public catalog only fills some of them, and it has no
 * category filter of its own. So we list just the categories that actually have emotes
 * (after our NSFW and dead-image filtering), with how many each holds.
 */
export async function emojiggCategories(): Promise<CatalogCategory[]> {
  const [all, names] = await Promise.all([load().entries, load().categories, ensureHealthLoaded()]);
  const counts = new Map<string, number>();
  let adult = 0;
  for (const e of all) {
    if (isDead(`emojigg:${e.id}`)) continue;
    if (e.adult) adult++;
    else counts.set(String(e.category), (counts.get(String(e.category)) ?? 0) + 1);
  }
  const safe = names
    .filter((c) => Number(c.id) !== NSFW_CATEGORY && counts.get(c.id))
    .map((c) => ({ ...c, count: counts.get(c.id)! }));
  // NSFW always sits last, and is marked so the client asks for an 18+ confirmation first.
  return adult ? [...safe, { id: String(NSFW_CATEGORY), name: "NSFW", count: adult, adult: true }] : safe;
}

export async function searchEmojigg(opts: {
  q: string;
  animated: boolean | null;
  category: string | null;
  page: number;
  /** Only true for an explicit NSFW request after age confirmation. */
  adult?: boolean;
}): Promise<CatalogPage> {
  const nsfw = opts.category === String(NSFW_CATEGORY);
  // Adult emotes only ever appear inside the NSFW category, and only when explicitly allowed.
  if (nsfw && !opts.adult) return { items: [], nextPage: null };
  const [all] = await Promise.all([load().entries, ensureHealthLoaded()]);
  const q = opts.q.trim().toLowerCase();
  // The extension is only a guess (some ".png" files are animated); trust the file once checked.
  const animated = (e: Entry) => animatedOf(`emojigg:${e.id}`) ?? e.animated;
  let list = all.filter(
    (e) =>
      !isDead(`emojigg:${e.id}`) &&
      e.adult === nsfw &&
      (opts.animated === null || animated(e) === opts.animated) &&
      (nsfw || !opts.category || String(e.category) === opts.category) &&
      (!q || e.lower.includes(q)),
  );
  // Best match first when searching, most loved first when browsing.
  list = q
    ? list.sort((a, b) => Number(b.lower.startsWith(q)) - Number(a.lower.startsWith(q)) || b.faves - a.faves)
    : list.sort((a, b) => b.faves - a.faves);
  const start = (opts.page - 1) * PAGE;
  const items = list.slice(start, start + PAGE).map((e) => ({
    source: e.source,
    id: e.id,
    name: e.name,
    animated: animated(e),
    preview: e.preview,
    author: e.author,
    page: e.page,
  }));
  return { items, nextPage: start + PAGE < list.length ? opts.page + 1 : null };
}

/** Resolves an id from our own copy of the catalog, never a caller-supplied URL. */
export async function emojiggImage(id: string) {
  const entry = (await load().entries).find((e) => e.id === id);
  if (!entry) return null;
  return { name: entry.name, animated: animatedOf(`emojigg:${entry.id}`) ?? entry.animated, urls: [entry.image] };
}

/** For reports from the browser: the image URL we'd show for an id, from our own copy. */
export async function emojiggPreview(id: string) {
  return (await load().entries).find((e) => e.id === id)?.image ?? null;
}
