import "server-only";
import { env } from "./env";
import type { Emote, GuildDetail, GuildSummary, Sticker, StickerFormat } from "./types";

const API = "https://discord.com/api/v10";

const PERM_ADMINISTRATOR = 1n << 3n;
const PERM_MANAGE_GUILD_EXPRESSIONS = 1n << 30n;
const PERM_CREATE_GUILD_EXPRESSIONS = 1n << 43n;

/** Slot limit per type (static and animated each) by boost tier. */
const SLOT_LIMITS = [50, 100, 150, 250] as const;
const STICKER_LIMITS = [5, 15, 30, 60] as const;

/** Longest 429 we wait out on the server; longer waits go back to the client as a 429. */
const MAX_RETRY_WAIT = 10;

/** Discord ids are numeric snowflakes. Checked before an id from a URL goes into an API path. */
export const isSnowflake = (id: string) => /^\d{17,20}$/.test(id);

export class DiscordError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Seconds Discord asked us to wait, on 429s. */
    public retryAfter?: number,
  ) {
    super(message);
  }
}

/** Discord's bucket state after a request, read from its X-RateLimit headers. */
export type RateState = { remaining: number | null; resetAfter: number | null };

const readRate = (res: Response): RateState => {
  const num = (h: string) => {
    const v = res.headers.get(h);
    return v === null ? null : Number(v);
  };
  return { remaining: num("x-ratelimit-remaining"), resetAfter: num("x-ratelimit-reset-after") };
};

type RequestOptions = {
  /** Wait out 429s on the server. Off for deletes, so the client can show the wait. */
  retry?: boolean;
  onRate?: (rate: RateState) => void;
};

async function request<T>(
  path: string,
  auth: string,
  init: RequestInit = {},
  opts: RequestOptions = {},
  attempt = 0,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      // Only JSON bodies get a JSON content type. Discord rejects a JSON content type on
      // bodiless requests (DELETE) as "invalid JSON", and multipart sets its own boundary.
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  opts.onRate?.(readRate(res));

  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { retry_after?: number; message?: string };
    const retryAfter = body.retry_after ?? Number(res.headers.get("retry-after") ?? 1);
    if (opts.retry !== false && attempt < 3 && retryAfter <= MAX_RETRY_WAIT) {
      await new Promise((r) => setTimeout(r, Math.ceil(retryAfter * 1000)));
      return request<T>(path, auth, init, opts, attempt + 1);
    }
    throw new DiscordError(429, "Discord is rate limiting this server", retryAfter);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      errors?: Record<string, { _errors?: { message: string }[] }>;
    } | null;
    const detail = body?.errors
      ? Object.values(body.errors).flatMap((e) => e._errors?.map((x) => x.message) ?? [])[0]
      : undefined;
    throw new DiscordError(res.status, detail ?? body?.message ?? res.statusText);
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}

const bot = <T>(path: string, init?: RequestInit, opts?: RequestOptions) =>
  request<T>(path, `Bot ${env.botToken}`, init, opts).catch((error: unknown) => {
    // A 401 here means BOT_TOKEN is wrong, not that the user's session expired, so it
    // mustn't look like one (that would sign the user out).
    if (error instanceof DiscordError && error.status === 401) {
      throw new DiscordError(502, "Discord rejected the bot token. Check BOT_TOKEN.");
    }
    throw error;
  });
const user = <T>(token: string, path: string) => request<T>(path, `Bearer ${token}`);

export function authorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: env.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "identify guilds",
    state,
    prompt: "none",
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export function botInviteUrl(guildId: string) {
  const params = new URLSearchParams({
    client_id: env.clientId,
    scope: "bot",
    permissions: String(PERM_MANAGE_GUILD_EXPRESSIONS | PERM_CREATE_GUILD_EXPRESSIONS),
    guild_id: guildId,
    disable_guild_select: "true",
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: env.clientId,
      client_secret: env.clientSecret,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new DiscordError(res.status, "Token exchange failed");
  return (await res.json()) as { access_token: string; expires_in: number };
}

export async function revokeToken(token: string) {
  await fetch(`${API}/oauth2/token/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token,
      token_type_hint: "access_token",
      client_id: env.clientId,
      client_secret: env.clientSecret,
    }),
    // Best effort: signing out shouldn't hang on Discord.
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}

type RawUser = { id: string; username: string; global_name: string | null; avatar: string | null };
export const getCurrentUser = (token: string) => user<RawUser>(token, "/users/@me");

type RawPartialGuild = { id: string; name: string; icon: string | null; owner: boolean; permissions: string };

const TTL = 30_000;
const userGuildCache = new Map<string, { at: number; value: Promise<RawPartialGuild[]> }>();
let botGuildCache: { at: number; value: Promise<Set<string>> } | null = null;

function userGuilds(token: string) {
  const now = Date.now();
  const hit = userGuildCache.get(token);
  if (hit && now - hit.at < TTL) return hit.value;
  // Keyed by access token, so drop stale entries rather than keep every past token in memory.
  for (const [key, entry] of userGuildCache) if (now - entry.at >= TTL) userGuildCache.delete(key);
  const value = user<RawPartialGuild[]>(token, "/users/@me/guilds");
  value.catch(() => userGuildCache.delete(token));
  userGuildCache.set(token, { at: Date.now(), value });
  return value;
}

function botGuildIds() {
  if (botGuildCache && Date.now() - botGuildCache.at < TTL) return botGuildCache.value;
  const value = (async () => {
    const ids = new Set<string>();
    let after = "0";
    for (;;) {
      const page = await bot<{ id: string }[]>(`/users/@me/guilds?limit=200&after=${after}`);
      page.forEach((g) => ids.add(g.id));
      if (page.length < 200) return ids;
      after = page.at(-1)!.id;
    }
  })();
  value.catch(() => (botGuildCache = null));
  botGuildCache = { at: Date.now(), value };
  return value;
}

function canManage(g: RawPartialGuild) {
  if (g.owner) return true;
  const perms = BigInt(g.permissions);
  return (perms & (PERM_ADMINISTRATOR | PERM_MANAGE_GUILD_EXPRESSIONS)) !== 0n;
}

export async function listManageableGuilds(token: string): Promise<GuildSummary[]> {
  const [guilds, installed] = await Promise.all([userGuilds(token), botGuildIds()]);
  return guilds
    .filter(canManage)
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon, botInstalled: installed.has(g.id) }))
    .sort((a, b) => Number(b.botInstalled) - Number(a.botInstalled) || a.name.localeCompare(b.name));
}

/** Throws 403 unless the signed-in user can manage expressions in this guild and the bot is in it. */
export async function assertGuildAccess(token: string, guildId: string) {
  const guilds = await listManageableGuilds(token);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) throw new DiscordError(403, "You can't manage emotes in this server");
  if (!guild.botInstalled) throw new DiscordError(409, "Emoteger isn't in this server yet");
  return guild;
}

type RawEmoji = {
  id: string;
  name: string;
  animated?: boolean;
  available?: boolean;
  managed?: boolean;
  user?: RawUser;
};

const toEmote = (e: RawEmoji): Emote => ({
  id: e.id,
  name: e.name,
  animated: Boolean(e.animated),
  available: e.available !== false,
  managed: Boolean(e.managed),
  addedBy: e.user ? { id: e.user.id, name: e.user.global_name ?? e.user.username } : null,
});

const guildCache = new Map<string, { at: number; value: Promise<GuildDetail> }>();

/** Name, icon and boost tier barely change; reuse them for a minute across tabs and pages. */
export function getGuildDetail(guildId: string): Promise<GuildDetail> {
  const hit = guildCache.get(guildId);
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  const value = fetchGuildDetail(guildId);
  value.catch(() => guildCache.delete(guildId));
  guildCache.set(guildId, { at: Date.now(), value });
  return value;
}

async function fetchGuildDetail(guildId: string): Promise<GuildDetail> {
  const g = await bot<{ id: string; name: string; icon: string | null; premium_tier: number }>(`/guilds/${guildId}`);
  return {
    id: g.id,
    name: g.name,
    icon: g.icon,
    limit: SLOT_LIMITS[g.premium_tier] ?? 50,
    stickerLimit: STICKER_LIMITS[g.premium_tier] ?? 5,
  };
}

export async function listEmotes(guildId: string) {
  const emojis = await bot<RawEmoji[]>(`/guilds/${guildId}/emojis`);
  return emojis.map(toEmote);
}

const reason = (actor: string) => ({ "X-Audit-Log-Reason": encodeURIComponent(`Emoteger · ${actor}`) });

export async function createEmote(
  guildId: string,
  name: string,
  image: string,
  actor: string,
  /** Imports pace themselves on the client, so they want 429s reported, not waited out. */
  opts: { retry?: boolean } = {},
) {
  let rate: RateState = { remaining: null, resetAfter: null };
  const e = await bot<RawEmoji>(
    `/guilds/${guildId}/emojis`,
    { method: "POST", body: JSON.stringify({ name, image }), headers: reason(actor) },
    { retry: opts.retry, onRate: (r) => (rate = r) },
  );
  return { emote: toEmote(e), rate };
}

export async function renameEmote(guildId: string, emojiId: string, name: string, actor: string) {
  const e = await bot<RawEmoji>(`/guilds/${guildId}/emojis/${emojiId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
    headers: reason(actor),
  });
  return toEmote(e);
}

/** Deletes report Discord's bucket state instead of waiting, so callers can pace themselves. */
export async function deleteEmote(guildId: string, emojiId: string, actor: string) {
  let rate: RateState = { remaining: null, resetAfter: null };
  await bot<void>(
    `/guilds/${guildId}/emojis/${emojiId}`,
    { method: "DELETE", headers: reason(actor) },
    { retry: false, onRate: (r) => (rate = r) },
  );
  return rate;
}

type RawSticker = {
  id: string;
  name: string;
  description: string | null;
  tags: string;
  format_type: StickerFormat;
  available?: boolean;
  user?: RawUser;
};

const toSticker = (s: RawSticker): Sticker => ({
  id: s.id,
  name: s.name,
  description: s.description ?? "",
  tags: s.tags,
  format: s.format_type,
  animated: s.format_type !== 1,
  available: s.available !== false,
  managed: false,
  addedBy: s.user ? { id: s.user.id, name: s.user.global_name ?? s.user.username } : null,
});

export async function listStickers(guildId: string) {
  const stickers = await bot<RawSticker[]>(`/guilds/${guildId}/stickers`);
  return stickers.map(toSticker);
}

export async function createSticker(
  guildId: string,
  fields: { name: string; description: string; tags: string },
  file: Blob,
  filename: string,
  actor: string,
  opts: { retry?: boolean } = {},
) {
  const form = new FormData();
  form.set("name", fields.name);
  form.set("description", fields.description);
  form.set("tags", fields.tags);
  form.set("file", file, filename);
  let rate: RateState = { remaining: null, resetAfter: null };
  const s = await bot<RawSticker>(
    `/guilds/${guildId}/stickers`,
    { method: "POST", body: form, headers: reason(actor) },
    { retry: opts.retry, onRate: (r) => (rate = r) },
  );
  return { sticker: toSticker(s), rate };
}

export async function editSticker(
  guildId: string,
  stickerId: string,
  fields: Partial<{ name: string; description: string; tags: string }>,
  actor: string,
) {
  const s = await bot<RawSticker>(`/guilds/${guildId}/stickers/${stickerId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
    headers: reason(actor),
  });
  return toSticker(s);
}

export async function deleteSticker(guildId: string, stickerId: string, actor: string) {
  let rate: RateState = { remaining: null, resetAfter: null };
  await bot<void>(
    `/guilds/${guildId}/stickers/${stickerId}`,
    { method: "DELETE", headers: reason(actor) },
    { retry: false, onRate: (r) => (rate = r) },
  );
  return rate;
}
