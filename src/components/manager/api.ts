import type { AssetKind } from "@/lib/types";
import type { Fields, Item } from "./types";

/** Discord asked us to wait. `retryAfter` is in seconds. */
export class RateLimited extends Error {
  constructor(public retryAfter: number) {
    super("Discord is rate limiting this server");
  }
}

export class RequestFailed extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Budget = { remaining: number | null; resetAfter: number | null };

async function send(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  if (res.status === 401) {
    window.location.href = "/api/auth/reset";
    throw new RequestFailed(401, "Signed out");
  }
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { retryAfter?: number };
    throw new RateLimited(body.retryAfter ?? Number(res.headers.get("retry-after") ?? 1));
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new RequestFailed(res.status, body.error ?? "Something went wrong");
  }
  return res;
}

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await send(url, init);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const header = (res: Response, name: string) => {
  const v = res.headers.get(name);
  return v === null ? null : Number(v);
};

const base = (kind: AssetKind, guildId: string) => `/api/guilds/${guildId}/${kind === "emote" ? "emojis" : "stickers"}`;

export const api = {
  create: (kind: AssetKind, guildId: string, fields: Fields & { image: string }) =>
    call<Item>(base(kind, guildId), { method: "POST", body: JSON.stringify(fields) }),
  update: (kind: AssetKind, guildId: string, id: string, fields: Fields) =>
    call<Item>(`${base(kind, guildId)}/${id}`, { method: "PATCH", body: JSON.stringify(fields) }),
  /** Imports one catalog emote; the server resolves the image from source + id. */
  importEmote: async (guildId: string, source: string, id: string, name: string) => {
    const res = await send(`/api/guilds/${guildId}/import`, { method: "POST", body: JSON.stringify({ source, id, name }) });
    const emote = (await res.json()) as Item;
    const budget: Budget = { remaining: header(res, "x-ratelimit-remaining"), resetAfter: header(res, "x-ratelimit-reset-after") };
    return { emote, budget };
  },
  /** Resolves with Discord's remaining delete budget; throws RateLimited when told to wait. */
  remove: async (kind: AssetKind, guildId: string, id: string): Promise<Budget> => {
    const res = await send(`${base(kind, guildId)}/${id}`, { method: "DELETE" });
    return { remaining: header(res, "x-ratelimit-remaining"), resetAfter: header(res, "x-ratelimit-reset-after") };
  },
};
