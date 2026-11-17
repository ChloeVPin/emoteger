import "server-only";
import sharp from "sharp";
import { apngToGif, isApng } from "../apng";

/*
  Turning catalog images into files Discord accepts. Shared by single imports, pack imports
  and pack downloads, so a downloaded pack contains exactly what an import would upload.
*/

const EMOTE_MAX = 256 * 1024;
const STICKER_MAX = 512 * 1024;
const STICKER_EDGE = 320;
const ALLOWED_HOSTS = /^https:\/\/(cdn\d*\.emoji\.gg|cdn\.7tv\.app|fonts\.gstatic\.com|cdn\.jsdelivr\.net)\//;

export async function download(url: string) {
  if (!ALLOWED_HOSTS.test(url)) throw new Error("Unexpected image host");
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** The real format, from the bytes. Hosts mislabel files (emoji.gg serves some GIFs as .png). */
export function sniff(bytes: Buffer): "gif" | "png" | "apng" | "webp" | "jpeg" | null {
  if (bytes.subarray(0, 4).toString("latin1") === "GIF8") return "gif";
  if (bytes[0] === 0x89 && bytes.subarray(1, 4).toString("latin1") === "PNG") return isApng(bytes) ? "apng" : "png";
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  return null;
}

/** Emotes: GIF for anything animated (APNG converted), as-is when small enough, shrunk otherwise. */
export async function emoteBytes(raw: Buffer): Promise<{ bytes: Buffer; ext: "gif" | "png" | "webp" | "jpeg" }> {
  let bytes = raw;
  let format = sniff(bytes);
  if (format === "apng") (bytes = apngToGif(bytes)), (format = "gif");
  if (!format) throw new Error("Unrecognized image format");
  const animated = format === "gif" || (format === "webp" && bytes.includes("ANIM"));
  if (bytes.byteLength <= EMOTE_MAX) return { bytes, ext: format };
  for (const edge of [128, 112, 96, 64, 48]) {
    const out = animated
      ? await sharp(bytes, { animated: true }).resize(edge, edge, { fit: "inside" }).gif({ effort: 7 }).toBuffer()
      : await sharp(bytes).resize(edge, edge, { fit: "inside" }).png({ compressionLevel: 9 }).toBuffer();
    if (out.byteLength <= EMOTE_MAX) return { bytes: out, ext: animated ? "gif" : "png" };
  }
  throw new Error("Image is too large for Discord even after resizing");
}

export async function emoteImage(raw: Buffer) {
  const { bytes, ext } = await emoteBytes(raw);
  return `data:image/${ext};base64,${bytes.toString("base64")}`;
}

/** Stickers: Discord wants PNG/APNG/GIF up to 320×320 and 512 KB. */
export async function stickerFile(raw: Buffer): Promise<{ blob: Blob; filename: string }> {
  const format = sniff(raw);
  if (!format) throw new Error("Unrecognized image format");
  const animated = format === "gif" || format === "apng" || (format === "webp" && raw.includes("ANIM"));
  if (format === "apng" && raw.byteLength <= STICKER_MAX) {
    return { blob: new Blob([new Uint8Array(raw)], { type: "image/png" }), filename: "sticker.png" };
  }
  if (animated) {
    const source = format === "apng" ? apngToGif(raw) : raw;
    if (format === "gif" && raw.byteLength <= STICKER_MAX && ((await sharp(raw).metadata()).width ?? 999) <= STICKER_EDGE) {
      return { blob: new Blob([new Uint8Array(raw)], { type: "image/gif" }), filename: "sticker.gif" };
    }
    // Largest first; each step trades a little size or colour. Discord shows stickers at 160px,
    // so even the last step stays sharp. Lossy inter-frame encoding is where GIFs shrink most.
    const plans = [
      { edge: 320, colours: 256, interFrameMaxError: 4, dither: 1 },
      { edge: 320, colours: 128, interFrameMaxError: 8, dither: 0.5 },
      { edge: 256, colours: 128, interFrameMaxError: 8, dither: 0.5 },
      { edge: 200, colours: 96, interFrameMaxError: 12, dither: 0.3 },
      { edge: 160, colours: 64, interFrameMaxError: 16, dither: 0 },
    ];
    for (const p of plans) {
      const out = await sharp(source, { animated: true })
        .resize(p.edge, p.edge, { fit: "inside" })
        .gif({ colours: p.colours, effort: 10, interFrameMaxError: p.interFrameMaxError, dither: p.dither })
        .toBuffer();
      if (out.byteLength <= STICKER_MAX) return { blob: new Blob([new Uint8Array(out)], { type: "image/gif" }), filename: "sticker.gif" };
    }
    throw new Error("Animation is too large for a Discord sticker");
  }
  const out = await sharp(raw)
    .resize(STICKER_EDGE, STICKER_EDGE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  if (out.byteLength > STICKER_MAX) throw new Error("Image is too large for a Discord sticker");
  return { blob: new Blob([new Uint8Array(out)], { type: "image/png" }), filename: "sticker.png" };
}

