import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Browse } from "@/components/browse/browse";
import { PACKS } from "@/lib/packs";
import { Library } from "@/components/manager/library";
import { ServerList } from "@/components/server-list";
import { ServerShell } from "@/components/shell";
import { LibrarySkeleton, ServersSkeleton } from "@/components/skeletons";
import { type DataSet, devEmotes, devGuild, devGuilds, devStickers, devUser } from "@/dev/fixtures";

const SETS: DataSet[] = ["demo", "worst", "empty", "one", "huge"];
const SCREENS = ["servers", "emotes", "stickers", "browse"] as const;

/** Dev-only stress harness: real components, worst-case Discord-shaped data. */
export default async function Dev({ searchParams }: PageProps<"/dev">) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const set = (SETS.includes(sp.data as DataSet) ? sp.data : "worst") as DataSet;
  const screen = SCREENS.find((s) => s === sp.screen) ?? "emotes";
  const user = devUser(set);

  // ?loading=1 shows the loading frame for the chosen screen, to compare against the real one.
  const loading = sp.loading === "1";
  const section = (screen === "stickers" ? "sticker" : screen === "browse" ? "browse" : "emote");

  return (
    <>
      {screen === "servers" ? (
        loading ? (
          <ServersSkeleton />
        ) : (
          <>
            <AppHeader user={user} />
            <main className="enter mx-auto max-w-[600px] px-4 pt-10 pb-24 sm:pt-16">
              <h1 className="display px-3 text-[20px] font-semibold">Servers</h1>
              <ServerList guilds={devGuilds(set)} inviteUrl={() => "#"} />
            </main>
          </>
        )
      ) : (
        // Same structure as app/servers/[guildId]/layout.tsx.
        <ServerShell user={user} guild={devGuild(set)} guilds={devGuilds(set).filter((g) => g.botInstalled)}>
          {loading ? (
            <LibrarySkeleton section={section} />
          ) : screen === "browse" ? (
            <Browse key={set} guild={devGuild(set)} existing={devEmotes(set)} existingStickers={devStickers(set)} packs={PACKS} />
          ) : (
            <Library
              key={`${screen}-${set}`}
              kind={screen === "stickers" ? "sticker" : "emote"}
              user={user}
              guild={devGuild(set)}
              initial={screen === "stickers" ? devStickers(set) : devEmotes(set)}
            />
          )}
        </ServerShell>
      )}

      <nav
        aria-label="Dev data"
        style={{ font: "12px system-ui", position: "fixed", left: "50%", bottom: 12, transform: "translateX(-50%)", zIndex: 100 }}
        className="flex gap-1 rounded-full bg-neutral-200 p-1 text-neutral-700"
      >
        {SCREENS.map((s) => (
          <a key={s} href={`/dev?screen=${s}&data=${set}`} className={`rounded-full px-2.5 py-1 ${s === screen ? "bg-white text-black" : ""}`}>
            {s}
          </a>
        ))}
        <span className="mx-1 w-px bg-neutral-400" />
        {SETS.map((d) => (
          <a key={d} href={`/dev?screen=${screen}&data=${d}`} className={`rounded-full px-2.5 py-1 ${d === set ? "bg-white text-black" : ""}`}>
            {d}
          </a>
        ))}
      </nav>
    </>
  );
}
