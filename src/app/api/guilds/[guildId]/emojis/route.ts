import { NextResponse } from "next/server";
import { assertGuildAccess, createEmote, isSnowflake } from "@/lib/discord";
import { errorResponse, readJson, signedOut } from "@/lib/http";
import { NAME_PATTERN } from "@/lib/names";
import { getSession } from "@/lib/session";

const MAX_BYTES = 256 * 1024;
const DATA_URI = /^data:image\/(png|jpeg|gif|webp|avif);base64,([A-Za-z0-9+/=]+)$/;

export async function POST(request: Request, ctx: RouteContext<"/api/guilds/[guildId]/emojis">) {
  const session = await getSession();
  if (!session) return signedOut();
  const { guildId } = await ctx.params;
  if (!isSnowflake(guildId)) return NextResponse.json({ error: "Unknown server" }, { status: 404 });

  try {
    await assertGuildAccess(session.accessToken, guildId);
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name : "";
    const image = typeof body.image === "string" ? body.image : "";
    if (!NAME_PATTERN.test(name)) {
      return NextResponse.json({ error: "Names are 2–32 letters, numbers or underscores" }, { status: 400 });
    }
    const match = DATA_URI.exec(image);
    if (!match || Math.floor((match[2]!.length * 3) / 4) > MAX_BYTES) {
      return NextResponse.json({ error: "Images must be PNG, JPEG, GIF, WebP or AVIF under 256 KB" }, { status: 400 });
    }
    const { emote } = await createEmote(guildId, name, image, session.user.username);
    return NextResponse.json(emote, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
