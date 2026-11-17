/**
 * Resolves the curated pack spec (names) into exact catalog entries (ids), and checks every
 * image actually loads. Run after editing spec.ts:
 *
 *   bun scripts/packs/build.ts
 *
 * 7TV: exact-name matches sorted by popularity; the version used in the most channels wins.
 * emoji.gg: exact title from our cached catalog, skipping images known to be dead, most-loved first.
 * Noto / Fluent: by name from their cached indexes.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogItem, Pack } from "../../src/lib/types";
import { PACKS, type SpecItem } from "./spec";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = async <T>(file: string) => JSON.parse(await readFile(path.join(ROOT, file), "utf8")) as T;

const HIDDEN_FLAGS = (1 << 16) | (1 << 17) | (1 << 18) | (1 << 24);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let memo: Record<string, CatalogItem | null> = {};
let lastQuery = 0;

/*
  Canonical versions come from the emote sets of large chat communities: one request returns
  hundreds of emotes, and when several communities use the same upload, that one is the classic.
  Search is only a fallback (7TV rate-limits it heavily).
*/
const CHANNELS = ["71092938", "44445592", "26301881", "26261471", "121059319", "23161357", "62300805", "26490481", "19571641", "39276140"];
type SetEmote = { id: string; name: string; data: { animated: boolean; flags: number; owner?: { display_name: string } | null } };
let setIndex: Map<string, Map<string, { count: number; e: SetEmote }>> | null = null;

async function loadSets() {
  if (setIndex) return setIndex;
  const cacheFile = path.join(ROOT, ".cache/7tv-sets.json");
  let sets: SetEmote[][] = await read<SetEmote[][]>(".cache/7tv-sets.json").catch(() => []);
  if (!sets.length) {
    const urls = ["https://7tv.io/v3/emote-sets/global", ...CHANNELS.map((id) => `https://7tv.io/v3/users/twitch/${id}`)];
    for (const url of urls) {
      const body = (await fetch(url, { headers: { "User-Agent": "Emoteger pack builder" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as
        | { emotes?: SetEmote[]; emote_set?: { emotes?: SetEmote[] } }
        | null;
      sets.push(body?.emotes ?? body?.emote_set?.emotes ?? []);
      await sleep(400);
    }
    await writeFile(cacheFile, JSON.stringify(sets));
  }
  setIndex = new Map();
  for (const set of sets)
    for (const e of set) {
      const byId = setIndex.get(e.name) ?? new Map();
      const hit = byId.get(e.id) ?? { count: 0, e };
      hit.count++;
      byId.set(e.id, hit);
      setIndex.set(e.name, byId);
    }
  return setIndex;
}

async function fromSets(name: string, animated?: boolean): Promise<CatalogItem | null> {
  const byId = (await loadSets()).get(name);
  if (!byId) return null;
  const best = [...byId.values()]
    .filter(({ e }) => (e.data.flags & HIDDEN_FLAGS) === 0 && (animated === undefined || e.data.animated === animated))
    .sort((a, b) => b.count - a.count)[0];
  if (!best) return null;
  const e = best.e;
  return {
    source: "7tv",
    id: e.id,
    name: e.name,
    animated: e.data.animated,
    preview: `https://cdn.7tv.app/emote/${e.id}/2x.webp`,
    author: e.data.owner?.display_name ?? null,
    page: `https://7tv.app/emotes/${e.id}`,
  };
}

/** Community sets first; then a paced, retried, remembered search. */
async function sevenTv(name: string, animated?: boolean): Promise<CatalogItem | null> {
  const fromSet = await fromSets(name, animated);
  if (fromSet) return fromSet;
  const key = `7tv:${name}:${animated ?? "any"}`;
  if (key in memo) return memo[key]!;
  for (let attempt = 0; attempt < 8; attempt++) {
    const wait = lastQuery + 2000 - Date.now();
    if (wait > 0) await sleep(wait);
    lastQuery = Date.now();
    const result = await sevenTvOnce(name, animated);
    if (result !== "rate-limited") {
      memo[key] = result;
      // Saved straight away, so an interrupted run never has to ask 7TV again.
      await writeFile(path.join(ROOT, ".cache/pack-resolve.json"), JSON.stringify(memo));
      return result;
    }
    console.log(`  … 7TV rate limit, waiting ${10 * (attempt + 1)}s`);
    await sleep(10_000 * (attempt + 1));
  }
  throw new Error(`7TV kept rate-limiting the lookup for "${name}"`);
}

async function sevenTvOnce(name: string, animated?: boolean): Promise<CatalogItem | null | "rate-limited"> {
  const res = await fetch("https://7tv.io/v3/gql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Emoteger pack builder" },
    body: JSON.stringify({
      query: `query($q: String!) { emotes(query: $q, limit: 25, filter: { exact_match: true, case_sensitive: true }, sort: { value: "popularity", order: DESCENDING }) {
        items { id name animated flags owner { display_name } channels(limit: 1) { total } } } }`,
      variables: { q: name },
    }),
  });
  const body = (await res.json()) as {
    errors?: { message: string }[];
    data?: { emotes: { items: { id: string; name: string; animated: boolean; flags: number; owner: { display_name: string } | null; channels: { total: number } }[] } };
  };
  if (!body.data && body.errors?.some((e) => /RATE_LIMIT/i.test(e.message))) return "rate-limited";
  const items = (body.data?.emotes.items ?? [])
    .filter((e) => (e.flags & HIDDEN_FLAGS) === 0 && (animated === undefined || e.animated === animated))
    .sort((a, b) => b.channels.total - a.channels.total);
  const e = items[0];
  if (!e) return null;
  return {
    source: "7tv",
    id: e.id,
    name: e.name,
    animated: e.animated,
    preview: `https://cdn.7tv.app/emote/${e.id}/2x.webp`,
    author: e.owner?.display_name ?? null,
    page: `https://7tv.app/emotes/${e.id}`,
  };
}

type EggRaw = { id: number; title: string; slug: string; image: string; category: number; faves: number; submitted_by: string };
let egg: EggRaw[] | null = null;
let health: Record<string, { ok: boolean; animated?: boolean }> = {};

async function emojigg(name: string, animated?: boolean): Promise<CatalogItem | null> {
  egg ??= await read<EggRaw[]>(".cache/emojigg/catalog.json");
  const candidates = egg
    .filter((e) => e.title.toLowerCase() === name.toLowerCase() && e.category !== 9)
    .filter((e) => health[`emojigg:${e.id}`]?.ok !== false)
    .map((e) => ({ e, anim: health[`emojigg:${e.id}`]?.animated ?? e.image.endsWith(".gif") }))
    .filter(({ anim }) => animated === undefined || anim === animated)
    .sort((a, b) => b.e.faves - a.e.faves || Number(a.e.title !== name) - Number(b.e.title !== name));
  const hit = candidates[0];
  if (!hit) return null;
  return {
    source: "emojigg",
    id: String(hit.e.id),
    name: hit.e.title,
    animated: hit.anim,
    preview: hit.e.image,
    author: hit.e.submitted_by || null,
    page: `https://emoji.gg/emoji/${hit.e.slug}`,
  };
}

type NotoRaw = { icons: { codepoint: string; tags: string[] }[] };
let noto: NotoRaw | null = null;
const title = (s: string) => s.replace(/[:_-]+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

async function notoItem(tag: string): Promise<CatalogItem | null> {
  noto ??= await read<NotoRaw>(".cache/noto-index.json");
  const icon = noto.icons.find((i) => i.tags.some((t) => t.replace(/:/g, "") === tag));
  if (!icon) return null;
  const base = `https://fonts.gstatic.com/s/e/notoemoji/latest/${icon.codepoint}`;
  return {
    source: "noto",
    id: icon.codepoint,
    name: title(icon.tags[0] ?? tag).slice(0, 30),
    animated: true,
    preview: `${base}/emoji.svg`,
    animatedPreview: `${base}/512.webp`,
    author: null,
    page: "https://googlefonts.github.io/noto-emoji-animation/",
  };
}

type FluentEntry = { id: string; path: string };
let fluent: FluentEntry[] | null = null;

async function fluentItem(name: string): Promise<CatalogItem | null> {
  fluent ??= await read<FluentEntry[]>(".cache/fluent-index.json");
  const e = fluent.find((x) => x.id.toLowerCase() === name.toLowerCase());
  if (!e) return null;
  return {
    source: "fluent",
    id: e.id,
    name: e.id.slice(0, 30),
    animated: false,
    preview: `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/${e.path.split("/").map(encodeURIComponent).join("/")}`,
    author: null,
    page: "https://github.com/microsoft/fluentui-emoji",
  };
}

async function resolve(item: SpecItem, fallback: string): Promise<CatalogItem | null> {
  const spec = typeof item === "string" ? { name: item } : item;
  const source = spec.source ?? fallback;
  const found =
    source === "7tv"
      ? await sevenTv(spec.name, spec.animated)
      : source === "emojigg"
        ? await emojigg(spec.name, spec.animated)
        : source === "noto"
          ? await notoItem(spec.name)
          : await fluentItem(spec.name);
  if (found && spec.as) found.name = spec.as;
  return found;
}

async function loads(url: string) {
  const res = await fetch(url, {
    headers: { Range: "bytes=0-1023", "Accept-Encoding": "identity", "User-Agent": "Emoteger pack builder" },
  }).catch(() => null);
  return Boolean(res && res.ok && (res.headers.get("content-type") ?? "").startsWith("image/"));
}

health = await read<typeof health>(".cache/image-health.json").catch(() => ({}));
memo = await read<typeof memo>(".cache/pack-resolve.json").catch(() => ({}));
const out: Pack[] = [];
let problems = 0;

for (const spec of PACKS) {
  const items: CatalogItem[] = [];
  for (const entry of spec.items) {
    const found = await resolve(entry, spec.source);
    const label = typeof entry === "string" ? entry : entry.name;
    if (!found) {
      console.warn(`  ✗ ${spec.id}: couldn't find "${label}"`);
      problems++;
      continue;
    }
    if (items.some((i) => i.source === found.source && i.id === found.id)) continue;
    if (!(await loads(found.preview))) {
      console.warn(`  ✗ ${spec.id}: "${label}" image doesn't load`);
      problems++;
      continue;
    }
    items.push(found);
  }
  const animated = items.filter((i) => i.animated).length;
  console.log(`${spec.id.padEnd(18)} ${String(items.length).padStart(2)} items (${animated} animated)`);
  out.push({ id: spec.id, title: spec.title, kind: spec.kind, tagline: spec.tagline, lore: spec.lore, sources: spec.sources, items });
}

await writeFile(path.join(ROOT, "src/data/packs.json"), `${JSON.stringify(out, null, 2)}\n`);
await writeFile(path.join(ROOT, ".cache/pack-resolve.json"), JSON.stringify(memo));
console.log(problems ? `\nWrote ${out.length} packs with ${problems} unresolved items (see above).` : `\nWrote ${out.length} packs.`);
