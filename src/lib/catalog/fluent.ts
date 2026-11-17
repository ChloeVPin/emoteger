import "server-only";
import type { CatalogItem, CatalogPage } from "../types";
import { diskJson } from "./disk";

/*
  Microsoft's Fluent Emoji in their 3D style: ~1,300 static images, MIT licensed
  (https://github.com/microsoft/fluentui-emoji). The file list comes from GitHub once a week.
*/

const TREE = "https://api.github.com/repos/microsoft/fluentui-emoji/git/trees/main?recursive=1";
const CDN = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main";
const PAGE = 60;

type Entry = { id: string; path: string; lower: string };

let entries: Promise<Entry[]> | null = null;
function load() {
  entries ??= diskJson<Entry[]>("fluent-index", TREE, 7 * 24 * 60 * 60 * 1000, (raw) =>
    ((raw as { tree: { path: string }[] }).tree ?? [])
      .map((t) => /^assets\/([^/]+)\/(?:Default\/)?3D\/[^/]+\.png$/.exec(t.path))
      .filter((m): m is RegExpExecArray => Boolean(m))
      .map((m) => ({ id: m[1]!, path: m[0], lower: m[1]!.toLowerCase() }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
  entries.catch(() => (entries = null));
  return entries;
}

const url = (path: string) => `${CDN}/${path.split("/").map(encodeURIComponent).join("/")}`;

const toItem = (e: Entry): CatalogItem => ({
  source: "fluent",
  id: e.id,
  name: e.id.slice(0, 30),
  animated: false,
  preview: url(e.path),
  author: null,
  page: "https://github.com/microsoft/fluentui-emoji",
});

export async function searchFluent(opts: { q: string; animated: boolean | null; page: number }): Promise<CatalogPage> {
  if (opts.animated === true) return { items: [], nextPage: null };
  const q = opts.q.trim().toLowerCase();
  const all = await load();
  // Faces and hands first: they're what people reach for as stickers.
  const rank = (e: Entry) => (/face/.test(e.lower) ? 0 : /hand|heart|cat|dog|party|fire|star/.test(e.lower) ? 1 : 2);
  const list = all.filter((e) => !q || e.lower.includes(q)).sort((a, b) => rank(a) - rank(b));
  const start = (opts.page - 1) * PAGE;
  return { items: list.slice(start, start + PAGE).map(toItem), nextPage: start + PAGE < list.length ? opts.page + 1 : null };
}

export async function fluentImage(id: string) {
  const e = (await load()).find((x) => x.id === id);
  if (!e) return null;
  const meta = await fetch(url(`assets/${e.id}/metadata.json`), { signal: AbortSignal.timeout(10_000) })
    .then((r) => (r.ok ? (r.json() as Promise<{ glyph?: string }>) : null))
    .catch(() => null);
  return { name: e.id.slice(0, 30), animated: false, glyph: meta?.glyph ?? "🙂", urls: [url(e.path)] };
}

export async function fluentPreview(id: string) {
  const e = (await load()).find((x) => x.id === id);
  return e ? url(e.path) : null;
}
