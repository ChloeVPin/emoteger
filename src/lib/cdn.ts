const CDN = "https://cdn.discordapp.com";

/** Discord's CDN only accepts power-of-two sizes (16–4096); anything else 400s. */
const cdnSize = (px: number) => 2 ** Math.min(12, Math.max(4, Math.ceil(Math.log2(px))));

export function emoteUrl(id: string, opts: { animated?: boolean; size?: number } = {}) {
  const params = new URLSearchParams({ size: String(cdnSize(opts.size ?? 96)), quality: "lossless" });
  if (opts.animated) params.set("animated", "true");
  return `${CDN}/emojis/${id}.webp?${params}`;
}

/** Lottie stickers (format 3) are JSON animations and have no raster URL. */
export function stickerUrl(id: string, format: 1 | 2 | 3 | 4, size = 320) {
  if (format === 3) return null;
  return `https://media.discordapp.net/stickers/${id}.${format === 4 ? "gif" : "png"}?size=${cdnSize(size)}`;
}

export function stickerDownloadUrl(id: string, format: 1 | 2 | 3 | 4) {
  return format === 3
    ? `https://discord.com/stickers/${id}.json`
    : `https://media.discordapp.net/stickers/${id}.${format === 4 ? "gif" : "png"}`;
}

export function emoteDownloadUrl(id: string, animated: boolean) {
  return `${CDN}/emojis/${id}.${animated ? "gif" : "png"}?size=4096`;
}

export function guildIconUrl(id: string, icon: string | null, size = 96) {
  if (!icon) return null;
  return `${CDN}/icons/${id}/${icon}.webp?size=${cdnSize(size)}`;
}

export function avatarUrl(user: { id: string; avatar: string | null }, size = 64) {
  if (user.avatar) return `${CDN}/avatars/${user.id}/${user.avatar}.webp?size=${cdnSize(size)}`;
  const index = Number((BigInt(user.id) >> 22n) % 6n);
  return `${CDN}/embed/avatars/${index}.png`;
}

export function emoteMarkdown(e: { id: string; name: string; animated: boolean }) {
  return `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`;
}

/** Discord-style acronym from grapheme clusters, so emoji and accents never split. */
export function initials(name: string, max = 2) {
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const words = name.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}\p{Extended_Pictographic}]/u.test(w));
  const first = (w: string) => seg.segment(w)[Symbol.iterator]().next().value?.segment ?? "";
  const lead = words[0] ? first(words[0]) : "";
  // An emoji-led name reads best as just the emoji, like Discord's own fallback.
  if (/\p{Extended_Pictographic}/u.test(lead)) return lead;
  return words.slice(0, max).map(first).join("") || "?";
}
