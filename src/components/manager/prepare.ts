const MAX_BYTES = 256 * 1024;
export const ACCEPT = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"];

const toDataUri = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

async function isAnimated(file: File) {
  if (file.type === "image/gif") return true;
  if (file.type !== "image/webp") return false;
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  return new TextDecoder().decode(head).includes("ANIM");
}

const encode = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode image"))), type, quality),
  );

/** Returns a Discord-ready data URI, downscaling static images that exceed the 256 KB limit. */
export async function prepareImage(file: File): Promise<{ image: string; animated: boolean }> {
  if (!ACCEPT.includes(file.type)) throw new Error("Use PNG, JPEG, GIF, WebP or AVIF");
  const animated = await isAnimated(file);
  if (file.size <= MAX_BYTES) return { image: await toDataUri(file), animated };
  if (animated) throw new Error("Animated images must be under 256 KB");

  const bitmap = await createImageBitmap(file);
  for (const edge of [256, 160, 128]) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const [type, q] of [["image/png"], ["image/webp", 0.92]] as const) {
      const blob = await encode(canvas, type, q);
      if (blob.size <= MAX_BYTES) {
        bitmap.close();
        return { image: await toDataUri(blob), animated: false };
      }
    }
  }
  bitmap.close();
  throw new Error("Image is too large even after resizing");
}

const STICKER_MAX_BYTES = 512 * 1024;
export const STICKER_ACCEPT = ["image/png", "image/apng", "image/gif", "image/jpeg", "image/webp", "image/avif"];
const STICKER_EDGE = 320;

async function isApng(file: File) {
  if (file.type !== "image/png" && file.type !== "image/apng") return false;
  const head = new Uint8Array(await file.slice(0, 256).arrayBuffer());
  return new TextDecoder("latin1").decode(head).includes("acTL");
}

/**
 * Animated files go through untouched (they can't be re-encoded in the browser).
 * Static images are fitted onto a transparent 320×320 PNG, which is what Discord stores.
 */
export async function prepareSticker(file: File): Promise<{ image: string; animated: boolean; format: 1 | 2 | 4 }> {
  if (!STICKER_ACCEPT.includes(file.type)) throw new Error("Use PNG, APNG or GIF");
  if (file.type === "image/gif" || (await isApng(file))) {
    if (file.size > STICKER_MAX_BYTES) throw new Error("Animated stickers must be under 512 KB");
    const image = await toDataUri(file);
    return { image: image.replace(/^data:image\/apng/, "data:image/png"), animated: true, format: file.type === "image/gif" ? 4 : 2 };
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = STICKER_EDGE;
  const scale = Math.min(STICKER_EDGE / bitmap.width, STICKER_EDGE / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (STICKER_EDGE - w) / 2, (STICKER_EDGE - h) / 2, w, h);
  bitmap.close();
  const blob = await encode(canvas, "image/png");
  if (blob.size > STICKER_MAX_BYTES) throw new Error("Image is too detailed to fit in 512 KB");
  return { image: await toDataUri(blob), animated: false, format: 1 };
}
