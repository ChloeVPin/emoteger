"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ui-sdk/react/avatar";
import { avatarUrl, guildIconUrl, initials } from "@/lib/cdn";
import type { SessionUser } from "@/lib/session";

export function GuildIcon({
  guild,
  size = 40,
  className = "",
  concentric = false,
}: {
  guild: { id: string; name: string; icon: string | null };
  size?: number;
  className?: string;
  concentric?: boolean;
}) {
  const src = guildIconUrl(guild.id, guild.icon, size * 2);
  return (
    <Avatar
      aria-hidden="true"
      title={guild.name}
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden bg-raised leading-none font-semibold text-fg-2 ${concentric ? "rounded-concentric" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: concentric ? undefined : Math.round(size * 0.32),
        fontSize: Math.round(size * (size < 28 ? 0.44 : 0.34)),
      }}
    >
      {src ? <AvatarImage src={src} alt="" width={size} height={size} className="size-full object-cover" draggable={false} /> : null}
      <AvatarFallback className="tracking-[-0.02em]">{initials(guild.name, size < 28 ? 1 : 2)}</AvatarFallback>
    </Avatar>
  );
}

export function UserAvatar({ user, size = 24 }: { user: SessionUser; size?: number }) {
  const name = user.globalName ?? user.username;
  return (
    <Avatar
      aria-hidden="true"
      className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-raised leading-none font-semibold text-fg-2"
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.42)) }}
    >
      <AvatarImage src={avatarUrl(user, size * 2)} alt="" width={size} height={size} className="size-full rounded-full object-cover" draggable={false} />
      <AvatarFallback>{initials(name, 1)}</AvatarFallback>
    </Avatar>
  );
}
