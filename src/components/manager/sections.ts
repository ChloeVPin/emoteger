"use client";

import { usePathname } from "next/navigation";
import type { AssetKind } from "@/lib/types";

export type Section = AssetKind | "browse";

const TABS: { kind: Section; path: string }[] = [
  { kind: "emote", path: "" },
  { kind: "sticker", path: "/stickers" },
  { kind: "browse", path: "/browse" },
];

export const sectionPath = (s: Section) => TABS.find((t) => t.kind === s)!.path;

/** The section is read from the URL, so the header can live in a layout that never re-renders. */
export function useSection(): Section {
  const path = usePathname();
  if (path.endsWith("/stickers")) return "sticker";
  if (path.endsWith("/browse")) return "browse";
  return "emote";
}
