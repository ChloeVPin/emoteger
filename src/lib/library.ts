import "server-only";
import { cache } from "react";
import { guarded } from "./auth";
import { assertGuildAccess, getGuildDetail, listEmotes, listManageableGuilds, listStickers } from "./discord";
import type { Session } from "./session";
import type { AssetKind } from "./types";

/** The server shell: shared by every tab, rendered once by the layout. */
export const loadShell = cache((session: Session, guildId: string) =>
  guarded(async () => {
    await assertGuildAccess(session.accessToken, guildId);
    const [all, guild] = await Promise.all([listManageableGuilds(session.accessToken), getGuildDetail(guildId)]);
    return { guilds: all.filter((g) => g.botInstalled), guild };
  }),
);

/** One tab's items. Access and guild details come from short-lived caches, so only the items hit Discord. */
export function loadLibrary(session: Session, guildId: string, kind: AssetKind) {
  return guarded(async () => {
    await assertGuildAccess(session.accessToken, guildId);
    const [guild, items] = await Promise.all([
      getGuildDetail(guildId),
      kind === "emote" ? listEmotes(guildId) : listStickers(guildId),
    ]);
    return { guild, items };
  });
}
