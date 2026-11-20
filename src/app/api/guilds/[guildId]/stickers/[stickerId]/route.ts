import { NextResponse } from "next/server";
import { assertGuildAccess, deleteSticker, editSticker, isSnowflake } from "@/lib/discord";
import { deletedResponse, errorResponse, readJson, signedOut } from "@/lib/http";
import { stickerRules } from "@/lib/names";
import { getSession } from "@/lib/session";

type Ctx = RouteContext<"/api/guilds/[guildId]/stickers/[stickerId]">;

const notFound = () => NextResponse.json({ error: "Unknown sticker" }, { status: 404 });

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return signedOut();
  const { guildId, stickerId } = await ctx.params;
  if (!isSnowflake(guildId) || !isSnowflake(stickerId)) return notFound();

  try {
    await assertGuildAccess(session.accessToken, guildId);
    const body = await readJson(request);
    const fields: Partial<{ name: string; description: string; tags: string }> = {};
    for (const key of ["name", "description", "tags"] as const) {
      const value = body[key];
      if (value === undefined) continue;
      if (typeof value !== "string" || !stickerRules[key](value)) {
        return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
      }
      fields[key] = value.trim();
    }
    return NextResponse.json(await editSticker(guildId, stickerId, fields, session.user.username));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) return signedOut();
  const { guildId, stickerId } = await ctx.params;
  if (!isSnowflake(guildId) || !isSnowflake(stickerId)) return notFound();

  try {
    await assertGuildAccess(session.accessToken, guildId);
    return deletedResponse(await deleteSticker(guildId, stickerId, session.user.username));
  } catch (error) {
    return errorResponse(error);
  }
}
