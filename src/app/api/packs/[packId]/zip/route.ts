import { strToU8, zipSync } from "fflate";
import { NextResponse } from "next/server";
import { download, emoteBytes, stickerFile } from "@/lib/catalog/convert";
import { resolveCatalogImage } from "@/lib/catalog/resolve";
import { getPack } from "@/lib/packs";
import { getSession } from "@/lib/session";

const LICENSES: Record<string, string> = {
  emojigg: "Community uploads on emoji.gg. Credit the creators listed below.",
  "7tv": "Community uploads on 7TV. Credit the creators listed below.",
  noto: "Noto Animated Emoji by Google, CC BY 4.0 (https://googlefonts.github.io/noto-emoji-animation/).",
  fluent: "Fluent Emoji by Microsoft, MIT License (https://github.com/microsoft/fluentui-emoji).",
};

/**
 * A pack as a .zip of Discord-ready files: the same conversions an import would apply
 * (GIF for animation, within Discord's size limits), plus a README with lore and credits.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/packs/[packId]/zip">) {
  if (!(await getSession()) && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Signed out" }, { status: 401 });
  }
  const { packId } = await ctx.params;
  const pack = getPack(packId);
  if (!pack) return NextResponse.json({ error: "Unknown pack" }, { status: 404 });

  const files: Record<string, Uint8Array> = {};
  const credits: string[] = [];
  const failed: string[] = [];
  const used = new Set<string>();

  // A few at a time: fast, without hammering the image hosts.
  const queue = [...pack.items];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        try {
          // Same file choice as an import (e.g. 7TV's sharpest size under Discord's limit).
          const found = await resolveCatalogImage(item.source, item.id);
          if (!found?.urls[0]) throw new Error("unavailable");
          const raw = await download(found.urls[0]);
          let base = item.name.replace(/[^\w\- ]+/g, "").trim() || item.id;
          for (let i = 2; used.has(base.toLowerCase()); i++) base = `${item.name}_${i}`;
          used.add(base.toLowerCase());
          if (pack.kind === "sticker") {
            const { blob, filename } = await stickerFile(raw);
            files[`${base}.${filename.split(".").pop()}`] = new Uint8Array(await blob.arrayBuffer());
          } else {
            const { bytes, ext } = await emoteBytes(raw);
            files[`${base}.${ext}`] = new Uint8Array(bytes);
          }
          credits.push(`${item.name}${item.author ? ` by ${item.author}` : ""} (${item.page})`);
        } catch {
          failed.push(item.name);
        }
      }
    }),
  );

  const sources = [...new Set(pack.items.map((i) => i.source))].map((s) => `- ${LICENSES[s]}`);
  const readme = [
    `${pack.title}`,
    `${pack.tagline}`,
    "",
    ...pack.lore,
    "",
    "Sources",
    ...pack.sources.map((s) => `- ${s.label}: ${s.url}`),
    "",
    "Licenses",
    ...sources,
    "",
    "Credits",
    ...credits.sort().map((c) => `- ${c}`),
    ...(failed.length ? ["", `Not included (couldn't be fetched): ${failed.join(", ")}`] : []),
    "",
    "Curated by Emoteger.",
  ].join("\n");
  files["README.txt"] = strToU8(readme);

  const zip = zipSync(files, { level: 0 });
  return new NextResponse(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${pack.id}.zip"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
