import type { Metadata } from "next";
import { Browse } from "@/components/browse/browse";
import { PACKS } from "@/lib/packs";
import { requireSession } from "@/lib/auth";
import { listManageableGuilds } from "@/lib/discord";
import { loadLibrary } from "@/lib/library";

type Props = PageProps<"/servers/[guildId]/browse">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await requireSession();
  const { guildId } = await params;
  const guilds = await listManageableGuilds(session.accessToken).catch(() => []);
  const name = guilds.find((g) => g.id === guildId)?.name;
  return { title: name ? `Browse · ${name}` : "Browse" };
}

export default async function BrowsePage({ params }: Props) {
  const session = await requireSession();
  const { guildId } = await params;
  // Existing emotes and stickers give us free slots and names to avoid clashing with.
  const [{ guild, items }, stickers] = await Promise.all([
    loadLibrary(session, guildId, "emote"),
    loadLibrary(session, guildId, "sticker"),
  ]);
  return <Browse key={guild.id} guild={guild} existing={items} existingStickers={stickers.items} packs={PACKS} />;
}
