import { NextResponse } from "next/server";
import { download, emoteImage, stickerFile } from "@/lib/catalog/convert";
import { resolveCatalogImage as resolve } from "@/lib/catalog/resolve";
import { DiscordError, type RateState, assertGuildAccess, createEmote, createSticker, isSnowflake } from "@/lib/discord";
import { HttpError, errorResponse, rateHeaders, readJson, signedOut } from "@/lib/http";
import { NAME_PATTERN, sanitizeName, stickerRules } from "@/lib/names";
import { getSession } from "@/lib/session";
import { SOURCE_KIND, isCatalogSource } from "@/lib/types";

export async function POST(request: Request, ctx: RouteContext<"/api/guilds/[guildId]/import">) {
  const session = await getSession();
  if (!session) return signedOut();
  const { guildId } = await ctx.params;
  if (!isSnowflake(guildId)) return NextResponse.json({ error: "Unknown server" }, { status: 404 });

  try {
    await assertGuildAccess(session.accessToken, guildId);
    const body = await readJson(request);
    const id = typeof body.id === "string" ? body.id.slice(0, 64) : "";
    const source = body.source;
    if (!isCatalogSource(source) || !id) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

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

    return NextResponse.json(created, { status: 201, headers: rateHeaders(rate) });
  } catch (error) {
    if (error instanceof DiscordError || error instanceof HttpError) return errorResponse(error);
    // Download and resize problems are specific and useful, so say what they were.
    console.error(error);
    return NextResponse.json({ error: (error as Error).message || "Couldn't import" }, { status: 422 });
  }
}
