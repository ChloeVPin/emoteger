import type { Metadata } from "next";
import { Library } from "@/components/manager/library";
import { requireSession } from "@/lib/auth";
import { listManageableGuilds } from "@/lib/discord";
import { loadLibrary } from "@/lib/library";

type Props = PageProps<"/servers/[guildId]/stickers">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await requireSession();
  const { guildId } = await params;
  const guilds = await listManageableGuilds(session.accessToken).catch(() => []);
  const name = guilds.find((g) => g.id === guildId)?.name;
  return { title: name ? `Stickers · ${name}` : "Stickers" };
}

export default async function StickersPage({ params }: Props) {
  const session = await requireSession();
  const { guildId } = await params;
  const { guild, items } = await loadLibrary(session, guildId, "sticker");
  return <Library key={`${guild.id}-sticker`} kind="sticker" user={session.user} guild={guild} initial={items} />;
}
