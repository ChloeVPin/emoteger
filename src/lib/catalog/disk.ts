import "server-only";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/** Gitignored scratch space, created on first write; a fresh clone starts without it. */
export const CACHE_DIR = path.join(process.cwd(), ".cache");

/** Writes through a temp file, so a crash mid-write never leaves a half-written cache. */
export async function writeCacheFile(file: string, text: string) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, text);
  await rename(tmp, file);
}

const readJson = async <T>(file: string) => JSON.parse(await readFile(file, "utf8")) as T;

/**
 * Fetches JSON through a disk copy: a fresh copy is reused across restarts, and if the
 * source is down or rate-limiting, the last good copy is served instead of an error.
 * `shrink` keeps only what we need, so big upstream payloads don't sit in memory or on disk.
 * `name` is always one of our own constants, never caller input.
 */
export async function diskJson<T>(name: string, url: string, ttl: number, shrink: (raw: unknown) => T = (r) => r as T): Promise<T> {
  const file = path.join(CACHE_DIR, `${name}.json`);
  const age = await stat(file).then((s) => Date.now() - s.mtimeMs).catch(() => Infinity);
  if (age < ttl) {
    // An unreadable copy is treated as stale and fetched again.
    const fresh = await readJson<T>(file).catch(() => undefined);
    if (fresh !== undefined) return fresh;
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Emoteger (Discord emote manager)" },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
    const data = shrink(await res.json());
    await writeCacheFile(file, JSON.stringify(data));
    return data;
  } catch (error) {
    if (age !== Infinity) {
      const stale = await readJson<T>(file).catch(() => undefined);
      if (stale !== undefined) return stale;
    }
    throw error;
  }
}
