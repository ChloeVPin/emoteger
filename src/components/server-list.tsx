import Link from "next/link";
import type { GuildSummary } from "@/lib/types";
import { GuildIcon } from "./avatar";
import { Button } from "./button";
import { ArrowRightIcon, ArrowUpRightIcon } from "./icons";

const group = "rounded-[18px] bg-surface p-1.5";
const row = "flex h-11 min-w-0 items-center gap-3 rounded-concentric pr-2 pl-1.5";

export function ServerList({ guilds, inviteUrl }: { guilds: GuildSummary[]; inviteUrl: (id: string) => string }) {
  if (guilds.length === 0) {
    return <p className="mt-6 text-fg-2">No servers where you can manage expressions.</p>;
  }

  const ready = guilds.filter((g) => g.botInstalled);
  const pending = guilds.filter((g) => !g.botInstalled);

  return (
    <div className="mt-6 flex flex-col gap-7">
      {ready.length ? (
        <ul className={group}>
          {ready.map((g) => (
            <li key={g.id} className="rounded-concentric">
              <Button
                variant="ghost"
                render={<Link href={`/servers/${g.id}`} />}
                className={`${row} group !h-11 w-full !justify-start !gap-3 !pr-2 !pl-1.5 !text-fg`}
              >
                <GuildIcon guild={g} size={32} concentric />
                <span dir="auto" title={g.name} className="min-w-0 flex-1 truncate text-left text-[14px] font-medium">
                  {g.name}
                </span>
                <ArrowRightIcon
                  size={14}
                  className="shrink-0 text-fg-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {pending.length ? (
        <section>
          <h2 className="mb-2 px-3 text-[12px] font-medium text-fg-3">Not added yet</h2>
          <ul className={group}>
            {pending.map((g) => (
              <li key={g.id} className={row}>
                <GuildIcon guild={g} size={32} concentric className="opacity-60 saturate-0" />
                <span dir="auto" title={g.name} className="min-w-0 flex-1 truncate text-[14px] text-fg-2">
                  {g.name}
                </span>
                <Button
                  variant="ghost"
                  render={<a href={inviteUrl(g.id)} target="_blank" rel="noreferrer" />}
                  aria-label={`Add Emoteger to ${g.name}`}
                  className="!h-7 shrink-0 !gap-1 !rounded-[7px] !pr-1.5 !pl-2.5 !text-[12px]"
                >
                  Add
                  <ArrowUpRightIcon size={13} className="text-fg-3" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
