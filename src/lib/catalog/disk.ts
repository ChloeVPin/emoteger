import "server-only";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), ".cache");

/**
 * Fetches JSON through a disk copy: a fresh copy is reused across restarts, and if the
 * source is down or rate-limiting, the last good copy is served instead of an error.
 * `shrink` keeps only what we need, so big upstream payloads don't sit in memory or on disk.
 */
export async function diskJson<T>(name: string, url: string, ttl: number, shrink: (raw: unknown) => T = (r) => r as T): Promise<T> {
  const file = path.join(DIR, `${name}.json`);
  const age = await stat(file).then((s) => Date.now() - s.mtimeMs).catch(() => Infinity);
  if (age < ttl) return JSON.parse(await readFile(file, "utf8")) as T;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Emoteger (Discord emote manager)" },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
    const data = shrink(await res.json());
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(data));
    return data;
  } catch (error) {
    if (age !== Infinity) return JSON.parse(await readFile(file, "utf8")) as T;
    throw error;
  }
}
