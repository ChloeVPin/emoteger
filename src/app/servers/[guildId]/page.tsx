import type { Metadata } from "next";
import { Library } from "@/components/manager/library";
import { requireSession } from "@/lib/auth";
import { listManageableGuilds } from "@/lib/discord";
import { loadLibrary } from "@/lib/library";

type Props = PageProps<"/servers/[guildId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await requireSession();
  const { guildId } = await params;
  const guilds = await listManageableGuilds(session.accessToken).catch(() => []);
  return { title: guilds.find((g) => g.id === guildId)?.name ?? "Emotes" };
}

export default async function EmotesPage({ params }: Props) {
  const session = await requireSession();
  const { guildId } = await params;
  const { guild, items } = await loadLibrary(session, guildId, "emote");
  return <Library key={`${guild.id}-emote`} kind="emote" user={session.user} guild={guild} initial={items} />;
}
