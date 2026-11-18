"use client";

import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@ui-sdk/react/meter";
import type { GuildDetail } from "@/lib/types";
import { GuildIcon } from "../avatar";
import type { KindConfig } from "./kinds";

function Slots({ label, used, limit }: { label: string; used: number; limit: number }) {
  const ratio = limit ? Math.min(1, used / limit) : 0;
  const tone = ratio >= 1 ? "bg-danger" : ratio >= 0.9 ? "bg-[oklch(0.78_0.14_65)]" : "bg-fg-2";
  return (
    <Meter
      value={used}
      min={0}
      max={Math.max(1, limit)}
      getValueLabel={(v) => `${v} of ${limit} used`}
    >
      <div className="flex h-6 items-center justify-between">
        <MeterLabel className="text-fg-2">{label}</MeterLabel>
        <MeterValue className="tabular text-fg-3">
          <span className={ratio >= 1 ? "text-danger" : "text-fg"}>{used}</span> / {limit}
        </MeterValue>
      </div>
      <MeterTrack className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-line">
        <MeterIndicator
          className={`h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out)] motion-reduce:transition-none ${tone}`}
        />
      </MeterTrack>
    </Meter>
  );
}

export function Overview({
  cfg,
  guild,
  counts,
}: {
  cfg: KindConfig;
  guild: GuildDetail;
  counts: { static: number; animated: number };
}) {
  const limit = cfg.limit(guild);
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <GuildIcon guild={guild} size={32} />
        <h2 dir="auto" title={guild.name} className="display line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold [overflow-wrap:anywhere]">
          {guild.name}
        </h2>
      </div>
      <div className="flex flex-col gap-4">
        {cfg.pooled ? (
          <Slots label="Stickers" used={counts.static + counts.animated} limit={limit} />
        ) : (
          <>
            <Slots label="Static" used={counts.static} limit={limit} />
            <Slots label="Animated" used={counts.animated} limit={limit} />
          </>
        )}
      </div>
      <p className="text-[12px] leading-[18px] text-fg-3">
        Select {cfg.kind === "emote" ? "an emote" : "a sticker"} to edit or delete it. Drop or paste images anywhere to upload.
      </p>
    </div>
  );
}
