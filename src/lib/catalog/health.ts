import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/*
  Some catalog entries point at images their host no longer has (emoji.gg answers 403
  AccessDenied for deleted files). We check images ourselves, remember the answer on disk,
  and filter dead ones out of results. Checks run in the background and never block a request.
*/

/** `animated` comes from the file's own bytes, since catalogs only tell us an extension. */
type Record = { ok: boolean; at: number; animated?: boolean };

const FILE = path.join(process.cwd(), ".cache", "image-health.json");
const RECHECK_DEAD = 24 * 60 * 60 * 1000; // hosts sometimes restore files
const RECHECK_OK = 7 * 24 * 60 * 60 * 1000;
const CONCURRENCY = 6;

let records: Map<string, Record> | null = null;
let loading: Promise<Map<string, Record>> | null = null;
let dirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function load() {
  if (records) return Promise.resolve(records);
  loading ??= readFile(FILE, "utf8")
    .then((text) => new Map(Object.entries(JSON.parse(text) as { [key: string]: Record })))
    .catch(() => new Map<string, Record>())
    .then((map) => (records = map));
  return loading;
}

function scheduleSave() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    if (!dirty || !records) return;
    dirty = false;
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(Object.fromEntries(records)));
  }, 2000);
}

/**
 * Reads the start of an image to tell whether it really animates:
 * GIF with more than one frame (or a loop block), PNG with an animation chunk (APNG), WebP with ANIM.
 */
export function sniffAnimated(bytes: Uint8Array): boolean | undefined {
  const ascii = new TextDecoder("latin1").decode(bytes);
  if (ascii.startsWith("GIF8")) return ascii.includes("NETSCAPE2.0") || ascii.split("\x21\xf9\x04").length > 2;
  if (ascii.startsWith("\x89PNG")) return ascii.includes("acTL");
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return ascii.includes("ANIM");
  return undefined;
}

/** What the file says about animation, once checked; undefined until then. */
export function animatedOf(key: string) {
  return records?.get(key)?.animated;
}

/** Synchronous lookup for filtering; unknown images count as alive until checked. */
export function isDead(key: string) {
  return records?.get(key)?.ok === false;
}

/** Warms the in-memory copy so `isDead` has answers on the first request. */
export function ensureHealthLoaded() {
  return load();
}

/**
 * Asks the host whether the image exists. Returns null when we couldn't tell (timeout,
 * network trouble), so a flaky connection never hides a working emote.
 */
async function probe(url: string): Promise<{ ok: boolean; animated?: boolean } | null> {
  try {
    // The first 8 KB is enough to see the format and whether it animates.
    const res = await fetch(url, {
      headers: { "User-Agent": "Emoteger (Discord emote manager)", Range: "bytes=0-8191" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.status === 429 || res.status >= 500) return null;
    const ok = res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
    if (!ok) return { ok: false };
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader && size < 8192) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    await reader?.cancel().catch(() => {});
    const head = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) head.set(c.subarray(0, Math.min(c.byteLength, size - at)), at), (at += c.byteLength);
    return { ok: true, animated: sniffAnimated(head.subarray(0, 8192)) };
  } catch {
    return null;
  }
}

export async function check(key: string, url: string) {
  const map = await load();
  const result = await probe(url);
  if (result === null) return map.get(key)?.ok ?? null;
  map.set(key, { ok: result.ok, at: Date.now(), animated: result.animated });
  scheduleSave();
  return result.ok;
}

let sweeping = false;

/** Walks a catalog in the background, a few requests at a time, checking anything stale. */
export async function sweep(entries: { key: string; url: string }[]) {
  if (sweeping) return;
  sweeping = true;
  try {
    const map = await load();
    const now = Date.now();
    const due = entries.filter(({ key }) => {
      const r = map.get(key);
      // Records from before animation sniffing existed get checked again.
      return !r || (r.ok && r.animated === undefined) || now - r.at > (r.ok ? RECHECK_OK : RECHECK_DEAD);
    });
    let next = 0;
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (next < due.length) {
          const { key, url } = due[next++]!;
          await check(key, url);
        }
      }),
    );
  } finally {
    sweeping = false;
  }
}
