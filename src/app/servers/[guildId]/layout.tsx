import { ServerShell } from "@/components/shell";
import { requireSession } from "@/lib/auth";
import { loadShell } from "@/lib/library";

/*
  The sidebar and panel frame render here, once per server. Switching between Emotes,
  Stickers and Browse swaps only what's inside the panel, so nothing around it redraws.
*/
export default async function ServerLayout({ children, params }: LayoutProps<"/servers/[guildId]">) {
  const session = await requireSession();
  const { guildId } = await params;
  const { guild, guilds } = await loadShell(session, guildId);

  return (
    <ServerShell user={session.user} guild={guild} guilds={guilds}>
      {children}
    </ServerShell>
  );
}
