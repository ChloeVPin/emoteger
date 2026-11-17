import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { RefreshOnFocus } from "@/components/refresh-on-focus";
import { ServerList } from "@/components/server-list";
import { guarded, requireSession } from "@/lib/auth";
import { botInviteUrl, listManageableGuilds } from "@/lib/discord";

export const metadata: Metadata = { title: "Servers" };

export default async function Servers() {
  const session = await requireSession();
  const guilds = await guarded(() => listManageableGuilds(session.accessToken));

  return (
    <>
      <AppHeader user={session.user} />
      <RefreshOnFocus />
      <main className="enter mx-auto max-w-[600px] px-4 pt-10 pb-24 sm:pt-16">
        <h1 className="display px-3 text-[20px] font-semibold">Servers</h1>
        <ServerList guilds={guilds} inviteUrl={botInviteUrl} />
      </main>
    </>
  );
}
