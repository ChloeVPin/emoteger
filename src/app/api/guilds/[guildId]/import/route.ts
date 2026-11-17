import { NextResponse } from "next/server";
import { download, emoteImage, stickerFile } from "@/lib/catalog/convert";
import { resolveCatalogImage as resolve } from "@/lib/catalog/resolve";
import { DiscordError, type RateState, assertGuildAccess, createEmote, createSticker } from "@/lib/discord";
import { errorResponse } from "@/lib/http";
import { NAME_PATTERN, sanitizeName, stickerRules } from "@/lib/names";
import { getSession } from "@/lib/session";
import { SOURCE_KIND } from "@/lib/types";

export async function POST(request: Request, ctx: RouteContext<"/api/guilds/[guildId]/import">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Signed out" }, { status: 401 });
  const { guildId } = await ctx.params;

  try {
    await assertGuildAccess(session.accessToken, guildId);
    const body = (await request.json()) as { source?: unknown; id?: unknown; name?: unknown };
    const id = typeof body.id === "string" ? body.id.slice(0, 64) : "";
    const source = (["emojigg", "7tv", "noto", "fluent"] as const).find((s) => s === body.source);
    if (!source || !id) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

    const found = await resolve(source, id);
    if (!found || !found.urls.length) return NextResponse.json({ error: "That item isn't available anymore" }, { status: 404 });
    const raw = await download(found.urls[0]!);
    const requested = typeof body.name === "string" ? body.name : found.name;

    let created: unknown;
    let rate: RateState;
    if (SOURCE_KIND[source] === "sticker") {
      const name = stickerRules.name(requested) ? requested.trim() : found.name;
      const glyph = "glyph" in found && typeof found.glyph === "string" ? found.glyph : "🙂";
      const { blob, filename } = await stickerFile(raw);
      ({ sticker: created, rate } = await createSticker(guildId, { name, description: "", tags: glyph }, blob, filename, session.user.username, { retry: false }));
    } else {
      const name = NAME_PATTERN.test(requested) ? requested : sanitizeName(requested);
      ({ emote: created, rate } = await createEmote(guildId, name, await emoteImage(raw), session.user.username, { retry: false }));
    }

    const headers = new Headers();
    if (rate.remaining !== null) headers.set("x-ratelimit-remaining", String(rate.remaining));
    if (rate.resetAfter !== null) headers.set("x-ratelimit-reset-after", String(rate.resetAfter));
    return NextResponse.json(created, { status: 201, headers });
  } catch (error) {
    if (error instanceof DiscordError) return errorResponse(error);
    // Download and resize problems are specific and useful, so say what they were.
    console.error(error);
    return NextResponse.json({ error: (error as Error).message || "Couldn't import" }, { status: 422 });
  }
}
