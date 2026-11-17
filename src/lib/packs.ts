import "server-only";
import packs from "@/data/packs.json";
import type { Pack } from "./types";

/** Curated packs, built from scripts/packs/spec.ts by scripts/packs/build.ts. */
export const PACKS = packs as Pack[];

export const getPack = (id: string) => PACKS.find((p) => p.id === id) ?? null;
