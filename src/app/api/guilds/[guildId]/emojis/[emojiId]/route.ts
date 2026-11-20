import { NextResponse } from "next/server";
import { assertGuildAccess, deleteEmote, isSnowflake, renameEmote } from "@/lib/discord";
import { deletedResponse, errorResponse, readJson, signedOut } from "@/lib/http";
import { NAME_PATTERN } from "@/lib/names";
import { getSession } from "@/lib/session";

type Ctx = RouteContext<"/api/guilds/[guildId]/emojis/[emojiId]">;

const notFound = () => NextResponse.json({ error: "Unknown emote" }, { status: 404 });

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return signedOut();
  const { guildId, emojiId } = await ctx.params;
  if (!isSnowflake(guildId) || !isSnowflake(emojiId)) return notFound();

  try {
    await assertGuildAccess(session.accessToken, guildId);
    const { name } = await readJson(request);
    if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
      return NextResponse.json({ error: "Names are 2–32 letters, numbers or underscores" }, { status: 400 });
    }
    return NextResponse.json(await renameEmote(guildId, emojiId, name, session.user.username));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return signedOut();
  const { guildId, emojiId } = await ctx.params;
  if (!isSnowflake(guildId) || !isSnowflake(emojiId)) return notFound();

  try {
    await assertGuildAccess(session.accessToken, guildId);
    return deletedResponse(await deleteEmote(guildId, emojiId, session.user.username));
  } catch (error) {
    return errorResponse(error);
  }
}
