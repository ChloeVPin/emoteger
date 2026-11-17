/**
 * Dev-only fixtures for /dev. Shaped exactly like the Discord-derived props the real
 * pages pass in, at the limits Discord enforces (guild names 2–100, emote names 2–32,
 * up to 250 static + 250 animated at boost tier 3). Never imported by production routes.
 */
import type { SessionUser } from "@/lib/session";
import type { Emote, GuildDetail, GuildSummary } from "@/lib/types";

export type DevItem = Emote & { preview: string; description?: string; tags?: string; format?: 1 | 2 | 3 | 4 };
export type DataSet = "demo" | "worst" | "empty" | "one" | "huge";

const svg = (w: number, h: number, body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;

const blob = (hue: number, glyph: string) =>
  svg(
    128,
    128,
    `<defs><radialGradient id="g" cx="40%" cy="35%"><stop offset="0" stop-color="hsl(${hue} 90% 70%)"/><stop offset="1" stop-color="hsl(${hue} 80% 48%)"/></radialGradient></defs><circle cx="64" cy="64" r="60" fill="url(#g)"/><text x="64" y="84" font-size="56" text-anchor="middle" font-family="system-ui" font-weight="800" fill="hsl(${hue} 70% 18%)">${glyph}</text>`,
  );

const wide = svg(
  256,
  64,
  `<rect width="256" height="64" rx="14" fill="#5865F2"/><text x="128" y="45" font-size="38" text-anchor="middle" font-family="system-ui" font-weight="900" fill="#fff">GG WP</text>`,
);
const tall = svg(32, 128, `<rect width="32" height="128" rx="10" fill="#22c55e"/><circle cx="16" cy="22" r="9" fill="#fff"/>`);
const tiny = svg(16, 16, `<rect width="16" height="16" rx="3" fill="#f97316"/>`);

let seq = 1_100_000_000_000_000_000n;
const id = () => String(seq++);

const emote = (name: string, preview: string, extra: Partial<Emote> = {}): DevItem => ({
  id: id(),
  name,
  animated: false,
  available: true,
  managed: false,
  addedBy: { id: "1", name: "Sam" },
  preview,
  ...extra,
});

const glyphs = ["☺", "♥", "★", "✓", "!", "?", "♪", "☂", "✿", "☀", "⚡", "☕"];
const words = ["pog", "kek", "sadge", "hype", "lul", "blobwave", "catjam", "peepoHappy", "monkaS", "copium", "based", "yep"];

function series(count: number, animated: boolean, offset = 0): DevItem[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + offset;
    return emote(`${words[n % words.length]}${n >= words.length ? `_${n}` : ""}`, blob((n * 47) % 360, glyphs[n % glyphs.length]!), {
      animated,
    });
  });
}

const worstHead: DevItem[] = [
  emote("pepeLaughingSoHardHeCantBreathe1", blob(120, "☺"), {
    addedBy: { id: "2", name: "Aleksandra Wiśniewska-Kowalczyk" },
  }),
  emote("ok", blob(200, "✓"), { addedBy: null }),
  emote("gg_wp", wide, { addedBy: { id: "3", name: "👩🏽‍💻 Priya" } }),
  emote("tall_boi", tall),
  emote("x_", tiny),
  emote("twitch_sub_hype_emote_tier_three", blob(280, "★"), { managed: true, addedBy: null }),
  emote("lost_boost_slot", blob(30, "♥"), { available: false }),
  emote("ok", blob(330, "!"), { animated: true, addedBy: { id: "4", name: "Đặng Thị Ngọc Hân" } }),
];

export const devUser = (set: DataSet): SessionUser =>
  set === "worst"
    ? { id: "80351110224678912", username: "thisisaverylongusernameallowed_", globalName: "Christopher Montgomery III 🦊✨", avatar: null }
    : { id: "80351110224678912", username: "sam", globalName: "Sam", avatar: null };

export function devGuild(set: DataSet): GuildDetail {
  if (set === "worst")
    return {
      id: "900000000000000001",
      name: "Northwind Makers Guild — Developers, Designers & Friends of the Open Source Community Network",
      icon: "deadbeefdeadbeefdeadbeefdeadbeef",
      limit: 50,
      stickerLimit: 5,
    };
  return {
    id: "900000000000000001",
    name: "Pixel Garden",
    icon: null,
    limit: set === "huge" ? 250 : 50,
    stickerLimit: set === "huge" ? 60 : 15,
  };
}

export function devEmotes(set: DataSet): DevItem[] {
  switch (set) {
    case "empty":
      return [];
    case "one":
      return [emote("blobwave", blob(48, "☺"))];
    case "huge":
      return [...series(250, false), ...series(250, true, 250)];
    case "worst":
      return [...worstHead, ...series(41, false, 3), ...series(49, true, 60)];
    default:
      return [...series(18, false), ...series(6, true, 18)];
  }
}

export function devGuilds(set: DataSet): GuildSummary[] {
  const base: GuildSummary[] = [
    { id: "900000000000000001", name: devGuild(set).name, icon: set === "worst" ? "deadbeefdeadbeefdeadbeefdeadbeef" : null, botInstalled: true },
  ];
  if (set === "empty") return [];
  if (set === "one") return base;
  const extra: GuildSummary[] =
    set === "worst"
      ? [
          { id: "900000000000000002", name: "王秀英的设计与开发服务器", icon: null, botInstalled: true },
          { id: "900000000000000003", name: "🦊 Fox Den", icon: null, botInstalled: true },
          { id: "900000000000000004", name: "نادي المبرمجين العرب للتصميم", icon: null, botInstalled: false },
          { id: "900000000000000005", name: "ab", icon: null, botInstalled: false },
          { id: "900000000000000006", name: "SafeNet | Buy and sell safely — verified middleman service, escrow & trading community", icon: "deadbeef", botInstalled: false },
          { id: "900000000000000007", name: "Benachrichtigungseinstellungenserver", icon: null, botInstalled: true },
        ]
      : [
          { id: "900000000000000002", name: "Design Lab", icon: null, botInstalled: true },
          { id: "900000000000000003", name: "SafeNet", icon: null, botInstalled: false },
        ];
  const many =
    set === "huge"
      ? Array.from({ length: 60 }, (_, i) => ({ id: String(900000000000001000 + i), name: `Community ${i + 1}`, icon: null, botInstalled: i % 3 !== 0 }))
      : [];
  return [...base, ...extra, ...many];
}

const card = (hue: number, text: string) =>
  svg(
    320,
    320,
    `<rect x="16" y="16" width="288" height="288" rx="64" fill="hsl(${hue} 85% 62%)"/><text x="160" y="196" font-size="96" text-anchor="middle" font-family="system-ui" font-weight="900" fill="hsl(${hue} 70% 16%)">${text}</text>`,
  );

const sticker = (name: string, preview: string, extra: Partial<DevItem> = {}): DevItem => ({
  id: id(),
  name,
  animated: false,
  available: true,
  managed: false,
  addedBy: { id: "1", name: "Sam" },
  description: "",
  tags: "🙂",
  format: 1,
  preview,
  ...extra,
});

export function devStickers(set: DataSet): DevItem[] {
  const words = ["GG", "LOL", "OK", "NO", "YES", "BRB", "GM", "GN", "WOW", "HI"];
  const series = (n: number) =>
    Array.from({ length: n }, (_, i) => sticker(`${words[i % words.length]} ${i + 1}`, card((i * 53) % 360, words[i % words.length]!), { animated: i % 4 === 0, format: i % 4 === 0 ? 2 : 1 }));
  switch (set) {
    case "empty":
      return [];
    case "one":
      return [sticker("Good morning", card(40, "GM"))];
    case "huge":
      return series(60);
    case "worst":
      return [
        sticker("Absolutely not, under any circ", card(10, "NO"), {
          description: "For when someone suggests deploying on a Friday afternoon right before a long weekend",
          tags: "🙅‍♀️",
          addedBy: { id: "2", name: "Aleksandra Wiśniewska-Kowalczyk" },
        }),
        sticker("ok", card(130, "OK"), { addedBy: null, tags: "👍" }),
        sticker("Lottie wave", "", { format: 3, animated: true }),
        sticker("Party", card(290, "🎉"), { format: 4, animated: true, available: false }),
        sticker("Wide banner", svg(320, 120, `<rect width="320" height="120" rx="24" fill="#5865F2"/><text x="160" y="80" font-size="56" text-anchor="middle" font-family="system-ui" font-weight="900" fill="#fff">GG WP</text>`)),
      ];
    default:
      return series(6);
  }
}
