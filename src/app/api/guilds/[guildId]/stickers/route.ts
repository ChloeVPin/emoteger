import { NextResponse } from "next/server";
import { assertGuildAccess, createSticker, isSnowflake } from "@/lib/discord";
import { errorResponse, readJson, signedOut } from "@/lib/http";
import { stickerRules } from "@/lib/names";
import { getSession } from "@/lib/session";

const MAX_BYTES = 512 * 1024;
const DATA_URI = /^data:image\/(png|apng|gif);base64,([A-Za-z0-9+/=]+)$/;

export async function POST(request: Request, ctx: RouteContext<"/api/guilds/[guildId]/stickers">) {
  const session = await getSession();
  if (!session) return signedOut();
  const { guildId } = await ctx.params;
  if (!isSnowflake(guildId)) return NextResponse.json({ error: "Unknown server" }, { status: 404 });

  try {
    await assertGuildAccess(session.accessToken, guildId);
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const tags = typeof body.tags === "string" ? body.tags.trim() : "";
    const image = typeof body.image === "string" ? body.image : "";

    if (!stickerRules.name(name)) return NextResponse.json({ error: "Names are 2–30 characters" }, { status: 400 });
    if (!stickerRules.description(description))
      return NextResponse.json({ error: "Descriptions are empty or 2–100 characters" }, { status: 400 });
    if (!stickerRules.tags(tags)) return NextResponse.json({ error: "Add a related emoji or tag" }, { status: 400 });

    const match = DATA_URI.exec(image);
    if (!match) return NextResponse.json({ error: "Stickers must be PNG, APNG or GIF" }, { status: 400 });
    const bytes = Buffer.from(match[2]!, "base64");
    if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ error: "Stickers must be under 512 KB" }, { status: 400 });

    const type = match[1] === "gif" ? "image/gif" : "image/png";
    const file = new Blob([bytes], { type });
    const { sticker } = await createSticker(
      guildId,
      { name, description, tags },
      file,
      `sticker.${match[1] === "gif" ? "gif" : "png"}`,
      session.user.username,
    );
    return NextResponse.json(sticker, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
