import { NextResponse } from "next/server";
import { emojiggCategories, searchEmojigg } from "@/lib/catalog/emojigg";
import { searchFluent } from "@/lib/catalog/fluent";
import { searchNoto } from "@/lib/catalog/noto";
import { searchSeventv } from "@/lib/catalog/seventv";
import type { CatalogSource } from "@/lib/types";
import { getSession } from "@/lib/session";

/** Signed-in only, so this can't be used as an open proxy to either catalog. */
export async function GET(request: Request) {
  // The dev harness (/dev) browses without a Discord login; production always requires one.
  if (!(await getSession()) && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Signed out" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("source");
  const source: CatalogSource = requested === "7tv" || requested === "noto" || requested === "fluent" ? requested : "emojigg";
  const q = (url.searchParams.get("q") ?? "").slice(0, 100);
  const page = Math.min(100, Math.max(1, Number(url.searchParams.get("page")) || 1));
  const kind = url.searchParams.get("animated");
  const animated = kind === "animated" ? true : kind === "static" ? false : null;
  const category = url.searchParams.get("category");

  try {
    if (url.searchParams.get("categories") === "1") {
      return NextResponse.json(await emojiggCategories(), { headers: { "Cache-Control": "private, max-age=3600" } });
    }
    const result =
      source === "7tv"
        ? await searchSeventv({ q, animated, page })
        : source === "noto"
          ? await searchNoto({ q, animated, page })
          : source === "fluent"
            ? await searchFluent({ q, animated, page })
            : await searchEmojigg({ q, animated, category, page, adult: url.searchParams.get("nsfw") === "1" });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: `Couldn't reach ${{ emojigg: "emoji.gg", "7tv": "7TV", noto: "Google Noto", fluent: "Fluent Emoji" }[source]} right now` },
      { status: 502 },
    );
  }
}
