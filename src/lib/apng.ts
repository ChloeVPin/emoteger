import "server-only";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import UPNG from "upng-js";

/** True when PNG bytes carry an animation chunk. */
export function isApng(bytes: Buffer) {
  return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && bytes.includes("acTL");
}

/**
 * Discord only animates emotes stored as GIF (or WebP), so an animated PNG is re-encoded
 * as a GIF, frame by frame with its own timings. Transparency is kept as a 1-bit mask,
 * which is all GIF can hold.
 */
export function apngToGif(bytes: Buffer) {
  const img = UPNG.decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const frames = UPNG.toRGBA8(img);
  const gif = GIFEncoder();
  frames.forEach((frame, i) => {
    const rgba = new Uint8Array(frame);
    const palette = quantize(rgba, 256, { format: "rgba4444", oneBitAlpha: true });
    const index = applyPalette(rgba, palette, "rgba4444");
    const transparentIndex = palette.findIndex((c) => c[3] === 0);
    gif.writeFrame(index, img.width, img.height, {
      palette,
      delay: img.frames[i]?.delay ?? 100,
      transparent: transparentIndex >= 0,
      transparentIndex: Math.max(0, transparentIndex),
    });
  });
  gif.finish();
  return Buffer.from(gif.bytes());
}
