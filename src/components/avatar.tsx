"use client";

import { useEffect, useRef, useState } from "react";
import { guildIconUrl, initials } from "@/lib/cdn";

export function GuildIcon({
  guild,
  size = 40,
  className = "",
  concentric = false,
}: {
  guild: { id: string; name: string; icon: string | null };
  size?: number;
  className?: string;
  /** Take the radius from the nearest rounded ancestor instead of the icon's own shape. */
  concentric?: boolean;
}) {
  const src = guildIconUrl(guild.id, guild.icon, size * 2);
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = src && failed !== src;
  const imgRef = useRef<HTMLImageElement>(null);

  // A 404 can land before hydration attaches onError; catch it after mount too.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(img.getAttribute("src"));
  }, [src]);

  return (
    <span
      title={guild.name}
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden bg-raised leading-none font-semibold text-fg-2 ${concentric ? "rounded-concentric" : ""} ${className}`}
      style={{ width: size, height: size, borderRadius: concentric ? undefined : Math.round(size * 0.32), fontSize: Math.round(size * (size < 28 ? 0.44 : 0.34)) }}
    >
      {showImage ? (
        <img
          ref={imgRef}
          src={src}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          draggable={false}
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-hidden className="tracking-[-0.02em]">
          {initials(guild.name, size < 28 ? 1 : 2)}
        </span>
      )}
    </span>
  );
}
