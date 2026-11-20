export const NAME_PATTERN = /^[A-Za-z0-9_]{2,32}$/;

export function sanitizeName(raw: string) {
  const base = raw
    .replace(/\.[^.]+$/, "")
    // Split accented letters and drop the accents, so "café" becomes "cafe", not "caf_".
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return base.length >= 2 ? base : `emote_${base}`.slice(0, 32);
}

export function uniqueName(name: string, taken: Set<string>) {
  if (!taken.has(name.toLowerCase())) return name;
  for (let i = 2; ; i++) {
    const suffix = `_${i}`;
    const candidate = name.slice(0, 32 - suffix.length) + suffix;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/** Discord sticker rules: name 2–30, description empty or 2–100, tags 1–200. */
export const stickerRules = {
  name: (v: string) => v.trim().length >= 2 && v.trim().length <= 30,
  description: (v: string) => v.trim().length === 0 || (v.trim().length >= 2 && v.trim().length <= 100),
  tags: (v: string) => v.trim().length >= 1 && v.trim().length <= 200,
};

/** Sticker names may contain spaces; keep the filename readable. */
export function stickerNameFromFile(raw: string) {
  const base = raw.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
  return base.length >= 2 ? base : `Sticker ${base}`.trim().slice(0, 30);
}
