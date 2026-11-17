import "server-only";
import type { CatalogItem, CatalogPage } from "../types";
import { ensureHealthLoaded, isDead } from "./health";

/* 7TV's public GraphQL API: free, no key, millions of community emotes. */

const GQL = "https://7tv.io/v3/gql";
const PAGE = 60;
const MAX_BYTES = 256 * 1024;

// Content flags 7TV assigns to emotes; anything sexual, flashing, edgy or Twitch-disallowed stays hidden.
const HIDDEN_FLAGS = (1 << 16) | (1 << 17) | (1 << 18) | (1 << 24);

type File = { name: string; width: number; height: number; size: number; format: string };
type Raw = {
  id: string;
  name: string;
  flags: number;
  animated: boolean;
  owner: { display_name: string } | null;
  host: { url: string; files: File[] };
};

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Emoteger (Discord emote manager)" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`7TV responded ${res.status}`);
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!body.data) throw new Error(body.errors?.[0]?.message ?? "7TV returned no data");
  return body.data;
}

const FIELDS = "id name flags animated owner { display_name } host { url files { name width height size format } }";

const host = (url: string) => (url.startsWith("//") ? `https:${url}` : url);

const searchCache = new Map<string, { at: number; value: Promise<CatalogPage> }>();

/** Identical searches within two minutes (paging back, re-opening Browse) reuse the result. */
export async function searchSeventv(opts: { q: string; animated: boolean | null; page: number }): Promise<CatalogPage> {
  await ensureHealthLoaded();
  const page = await cachedSeventv(opts);
  // Filter at read time, so images reported broken after caching disappear too.
  return { ...page, items: page.items.filter((i) => !isDead(`7tv:${i.id}`)) };
}

function cachedSeventv(opts: { q: string; animated: boolean | null; page: number }): Promise<CatalogPage> {
  const key = JSON.stringify([opts.q.trim().toLowerCase(), opts.animated, opts.page]);
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < 120_000) return hit.value;
  const value = fetchSeventv(opts);
  value.catch(() => searchCache.delete(key));
  searchCache.set(key, { at: Date.now(), value });
  if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value!);
  return value;
}

async function fetchSeventv(opts: { q: string; animated: boolean | null; page: number }): Promise<CatalogPage> {
  const filter: Record<string, unknown> = {};
  if (opts.animated !== null) filter.animated = opts.animated;
  // With nothing typed, show what's trending this week instead of an arbitrary slice.
  if (!opts.q.trim()) filter.category = "TRENDING_WEEK";

  const data = await gql<{ emotes: { max_page: number; items: Raw[] } }>(
    `query($q: String!, $page: Int, $limit: Int, $filter: EmoteSearchFilter) {
      emotes(query: $q, page: $page, limit: $limit, filter: $filter) { max_page items { ${FIELDS} } }
    }`,
    { q: opts.q.trim(), page: opts.page, limit: PAGE, filter },
  );

  const items: CatalogItem[] = data.emotes.items
    // 7TV ignores `animated: false`, so enforce the static filter here.
    .filter((e) => e && (e.flags & HIDDEN_FLAGS) === 0 && (opts.animated === null || e.animated === opts.animated))
    .map((e) => ({
      source: "7tv",
      id: e.id,
      name: e.name,
      animated: e.animated,
      preview: `${host(e.host.url)}/2x.webp`,
      author: e.owner?.display_name ?? null,
      page: `https://7tv.app/emotes/${e.id}`,
    }));
  return { items, nextPage: opts.page < data.emotes.max_page ? opts.page + 1 : null };
}

/**
 * Picks real files for an emote, largest first, preferring ones already under Discord's
 * 256 KB limit. Animated emotes use GIF (what Discord stores); stills use WebP or PNG.
 */
export async function seventvImage(id: string) {
  if (!/^[0-9A-Z]{26}$|^[0-9a-f]{24}$/.test(id)) return null;
  const data = await gql<{ emote: Raw | null }>(`query($id: ObjectID!) { emote(id: $id) { ${FIELDS} } }`, { id });
  const e = data.emote;
  if (!e || (e.flags & HIDDEN_FLAGS) !== 0) return null;
  const formats = e.animated ? ["GIF"] : ["PNG", "WEBP"];
  const usable = e.host.files.filter((f) => formats.includes(f.format));
  // Largest file that already fits and is big enough to look sharp; otherwise the smallest
  // sharp one, which the import route shrinks to fit (rather than a blurry 32px file).
  const sharpFit = usable.filter((f) => f.size <= MAX_BYTES && f.width >= 64).sort((a, b) => b.width - a.width);
  const sharpLarge = usable.filter((f) => f.width >= 64).sort((a, b) => a.size - b.size);
  const files = [...sharpFit, ...sharpLarge, ...usable];
  return { name: e.name, animated: e.animated, urls: files.map((f) => `${host(e.host.url)}/${f.name}`) };
}

export const seventvPreview = (id: string) =>
  /^[0-9A-Z]{26}$|^[0-9a-f]{24}$/.test(id) ? `https://cdn.7tv.app/emote/${id}/2x.webp` : null;
