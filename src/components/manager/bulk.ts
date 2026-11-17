"use client";

import { useSyncExternalStore } from "react";
import type { AssetKind, CatalogSource } from "@/lib/types";
import { RateLimited, RequestFailed, api } from "./api";
import type { Item } from "./types";

/*
  A bulk delete runs here, outside React, so it survives closing the modal and moving
  between pages. Pacing follows Discord's rate-limit headers: keep going until the bucket is
  empty, then wait exactly as long as Discord says.
*/

export type Target = {
  key: string;
  id: string;
  name: string;
  /** Imports only: where the emote comes from, and a small preview for the modal. */
  source?: CatalogSource;
  preview?: string;
};

export type BulkJob = {
  /** Delete removes existing items; import adds catalog emotes to the server. */
  action: "delete" | "import";
  phase: "confirm" | "running" | "done";
  open: boolean;
  guildId: string;
  guildName: string;
  kind: AssetKind;
  targets: Target[];
  skipped: number;
  done: number;
  failures: { name: string; reason: string }[];
  current: string | null;
  /** Epoch ms when a Discord-imposed pause ends. */
  waitUntil: number | null;
  stopping: boolean;
  stopped: boolean;
  /** Set when the job gave up because every attempt failed the same way. */
  aborted: string | null;
};

let job: BulkJob | null = null;
const listeners = new Set<() => void>();
const deletedListeners = new Set<(guildId: string, kind: AssetKind, id: string) => void>();
/** Ids deleted by bulk jobs this session, so a page that remounts doesn't show them again. */
const deletedIds = new Set<string>();
const addedListeners = new Set<(guildId: string, emote: Item, sourceKey: string) => void>();
/** Catalog keys (`source:id`) imported this session, so Browse can mark them as added. */
const importedKeys = new Set<string>();

function set(patch: Partial<BulkJob> | null) {
  job = patch === null ? null : ({ ...job!, ...patch } as BulkJob);
  listeners.forEach((l) => l());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Waits out a Discord pause in short slices so Stop takes effect immediately. */
async function pause(seconds: number) {
  const until = Date.now() + Math.max(0.25, seconds) * 1000;
  set({ waitUntil: until });
  while (Date.now() < until && !job?.stopping) await sleep(Math.min(250, until - Date.now()));
  set({ waitUntil: null });
}

function guardUnload(on: boolean) {
  const handler = (e: BeforeUnloadEvent) => e.preventDefault();
  if (on) window.addEventListener("beforeunload", handler);
  else window.removeEventListener("beforeunload", handler);
  return handler;
}

async function run() {
  if (!job) return;
  const { guildId, kind, targets } = job;
  const unload = guardUnload(true);

  let streak: { status: number; count: number } | null = null;

  for (const [index, target] of targets.entries()) {
    if (job.stopping || job.aborted) break;
    const last = index === targets.length - 1;
    // If the first few deletes all fail the same way, the rest will too: stop and say why.
    if (job.done === 0 && streak && streak.count >= 3) {
      set({ aborted: job.failures[0]?.reason ?? "Discord rejected the request" });
      break;
    }
    set({ current: target.name });

    for (;;) {
      try {
        let budget;
        if (job.action === "import") {
          const result = await api.importEmote(guildId, target.source!, target.id, target.name);
          budget = result.budget;
          importedKeys.add(target.key);
          addedListeners.forEach((l) => l(guildId, { ...result.emote, key: result.emote.id }, target.key));
        } else {
          budget = await api.remove(kind, guildId, target.id);
          deletedIds.add(target.id);
          deletedListeners.forEach((l) => l(guildId, kind, target.id));
        }
        set({ done: job.done + 1 });
        // Discord says the bucket is empty: wait for its reset before the next request.
        // (Nothing left to send after the last one, so no reason to make anyone wait.)
        if (!last && budget.remaining === 0 && budget.resetAfter) await pause(budget.resetAfter);
        break;
      } catch (error) {
        if (error instanceof RateLimited) {
          await pause(error.retryAfter);
          if (job.stopping) break;
          continue;
        }
        // Out of slots: every remaining import would fail the same way, so stop now and say so.
        if (job.action === "import" && error instanceof RequestFailed && /maximum number/i.test(error.message)) {
          set({ aborted: "This server has no emote slots left", failures: [...job.failures, { name: target.name, reason: error.message }] });
          break;
        }
        if (job.action === "delete" && error instanceof RequestFailed && error.status === 404) {
          // Already gone (deleted elsewhere): that's the outcome we wanted.
          deletedIds.add(target.id);
          deletedListeners.forEach((l) => l(guildId, kind, target.id));
          set({ done: job.done + 1 });
          break;
        }
        const status = error instanceof RequestFailed ? error.status : 0;
        const prev = streak as { status: number; count: number } | null;
        streak = prev?.status === status ? { status, count: prev.count + 1 } : { status, count: 1 };
        set({ failures: [...job.failures, { name: target.name, reason: (error as Error).message }] });
        break;
      }
    }
  }

  window.removeEventListener("beforeunload", unload);
  set({ phase: "done", current: null, waitUntil: null, stopped: job.stopping, stopping: false });
}

export const bulk = {
  prepare(input: Pick<BulkJob, "guildId" | "guildName" | "kind" | "targets" | "skipped">) {
    if (job?.phase === "running") return set({ open: true });
    set({ ...input, action: "delete", phase: "confirm", open: true, done: 0, failures: [], current: null, waitUntil: null, stopping: false, stopped: false, aborted: null } as BulkJob);
  },
  /** Imports start straight away: picking emotes and pressing Add is the confirmation. */
  importNow(input: Pick<BulkJob, "guildId" | "guildName" | "targets"> & { kind?: AssetKind }) {
    if (job?.phase === "running") return false;
    set({ kind: "emote", ...input, skipped: 0, action: "import", phase: "running", open: true, done: 0, failures: [], current: null, waitUntil: null, stopping: false, stopped: false, aborted: null } as BulkJob);
    void run();
    return true;
  },
  onAdded(listener: (guildId: string, emote: Item, sourceKey: string) => void) {
    addedListeners.add(listener);
    return () => void addedListeners.delete(listener);
  },
  wasImported: (key: string) => importedKeys.has(key),
  start() {
    if (!job || job.phase !== "confirm") return;
    set({ phase: "running" });
    void run();
  },
  stop() {
    if (job?.phase === "running") set({ stopping: true });
  },
  setOpen(open: boolean) {
    if (!job) return;
    // Closing before it starts, or after it ends, is the same as dismissing it.
    if (!open && job.phase !== "running") return set(null);
    set({ open });
  },
  onDeleted(listener: (guildId: string, kind: AssetKind, id: string) => void) {
    deletedListeners.add(listener);
    return () => void deletedListeners.delete(listener);
  },
  wasDeleted: (id: string) => deletedIds.has(id),
};

export function useBulk() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => job,
    () => null,
  );
}

/** Re-renders on an interval while `active`, for live countdowns. */
export function useNow(active: boolean, every = 250) {
  return useSyncExternalStore(
    (l) => {
      if (!active) return () => {};
      const id = window.setInterval(l, every);
      return () => window.clearInterval(id);
    },
    () => (active ? Math.floor(Date.now() / every) * every : 0),
    () => 0,
  );
}
