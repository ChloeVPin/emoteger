import { NextResponse } from "next/server";
import { emojiggPreview } from "@/lib/catalog/emojigg";
import { check } from "@/lib/catalog/health";
import { fluentPreview } from "@/lib/catalog/fluent";
import { notoPreview } from "@/lib/catalog/noto";
import { seventvPreview } from "@/lib/catalog/seventv";
import { getSession } from "@/lib/session";

/**
 * The browser reports an image that failed to load. We never trust the report itself:
 * we look up the URL from our own data and ask the host. Only a real failure hides it.
 */
export async function POST(request: Request) {
  if (!(await getSession()) && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Signed out" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { source?: unknown; id?: unknown };
  const id = typeof body.id === "string" ? body.id.slice(0, 64) : "";
  const source = (["emojigg", "7tv", "noto", "fluent"] as const).find((s) => s === body.source) ?? null;
  if (!source || !id) return NextResponse.json({ error: "Unknown emote" }, { status: 400 });

  const url =
    source === "7tv"
      ? seventvPreview(id)
      : source === "noto"
        ? notoPreview(id)
        : source === "fluent"
          ? await fluentPreview(id)
          : await emojiggPreview(id);
  if (!url) return NextResponse.json({ error: "Unknown emote" }, { status: 404 });

  const ok = await check(`${source}:${id}`, url);
  return NextResponse.json({ dead: ok === false });
}
