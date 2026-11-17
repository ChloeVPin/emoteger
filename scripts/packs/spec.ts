import type { AssetKind, CatalogSource } from "../../src/lib/types";

/** A pack item by name; `as` renames it in the pack, `animated` picks a specific version. */
export type SpecItem = string | { name: string; source?: CatalogSource; animated?: boolean; as?: string };

export type PackSpec = {
  id: string;
  title: string;
  kind: AssetKind;
  /** Default source for this pack's items. */
  source: CatalogSource;
  tagline: string;
  lore: string[];
  sources: { label: string; url: string }[];
  items: SpecItem[];
};

export const PACKS: PackSpec[] = [
  {
    id: "chat-classics",
    title: "Chat Classics",
    kind: "emote",
    source: "7tv",
    tagline: "The vocabulary of Twitch chat, ready for your server.",
    lore: [
      "Twitch chat built a language out of a handful of built-in emotes like Kappa and PogChamp, then extensions like BetterTTV, FrankerFaceZ and 7TV let communities upload their own. These are the ones that stuck: KEKW and OMEGALUL for laughing, monkaS for nerves, Sadge for sadness, Copium for denial.",
      "KEKW is Spanish comedian Juan Joya Borja (\u201cEl Risitas\u201d) laughing in a 2007 TV interview; it took off in 2019. Sadge is a 2020 edit of the 2009 \u201cFeels Bad Man\u201d frog. Each pick here is the version used in the most 7TV channels.",
    ],
    sources: [
      { label: "Know Your Meme: KEKW", url: "https://knowyourmeme.com/memes/kekw" },
      { label: "Know Your Meme: Sadge", url: "https://knowyourmeme.com/memes/sadge" },
      { label: "Know Your Meme: monkaS", url: "https://knowyourmeme.com/memes/monkas" },
    ],
    items: [
      "KEKW", "OMEGALUL", "LULW", "PogU", "Pog", "monkaS", "Sadge", "Copium", "Clueless", "Aware", "ICANT", "xdd",
      "EZ", "5Head", "Pepega", "Okayge", "Stare", "Bedge", "catJAM", "Chatting",
    ],
  },
  {
    id: "pepe-essentials",
    title: "Pepe Essentials",
    kind: "emote",
    source: "7tv",
    tagline: "Every feeling, as a frog.",
    lore: [
      "Pepe the Frog comes from Matt Furie\u2019s comic Boy\u2019s Club (2005), where his line \u201cfeels good man\u201d spread across the internet from 2008. Edits of him became one of Twitch chat\u2019s largest emote families, one for nearly every emotion.",
      "His history isn\u2019t all light: from 2015\u201316 he was misused by the alt-right, and Furie spent years reclaiming the character (the 2020 documentary Feels Good Man tells that story). In 2019 Hong Kong protesters adopted him as a pro-democracy symbol. Today\u2019s chat Pepes are the everyday kind collected here.",
    ],
    sources: [
      { label: "Wikipedia: Pepe the Frog", url: "https://en.wikipedia.org/wiki/Pepe_the_Frog" },
      { label: "Know Your Meme: Feels Bad Man", url: "https://knowyourmeme.com/memes/feels-bad-man-sad-frog" },
    ],
    items: [
      "FeelsGoodMan", "FeelsBadMan", "FeelsStrongMan", "FeelsOkayMan", "PepeHands", "PepeLaugh", "monkaHmm", "Madge",
      "peepoHappy", "widepeepoHappy", "peepoSad", "POGGERS", "pepeD", "PepePls", "peepoClap", "PepoG",
    ],
  },
  {
    id: "blobs",
    title: "Blobs",
    kind: "emote",
    source: "emojigg",
    tagline: "Google\u2019s retired blob emoji, kept alive by Discord.",
    lore: [
      "Google\u2019s round, gummy blob emoji shipped with Android 4.4 KitKat in 2013 and were retired in Android 8.0 Oreo in 2017, replaced by circular faces for consistency across platforms.",
      "Fans didn\u2019t let them go: the Blobmoji project and blob-themed Discord servers kept making new ones, Google brought them back as Gboard stickers in 2018, and the community added the blobcat along the way.",
    ],
    sources: [
      { label: "Wikipedia: Blob emoji", url: "https://en.wikipedia.org/wiki/Blob_emoji" },
      { label: "Emojipedia: RIP Blobs", url: "https://blog.emojipedia.org/rip-blobs-google-redesigns-emojis/" },
    ],
    items: [
      "partyblob", "blobaww", "BlobLove", "blobkiss", "blobowo", "blobevil", "blobcorn", "blobnomcookie", "blobhang",
      "blobshake", "blobspearpeek", "blobhyperthink", "BlobbleWobble", "BlobKittenKnife", "ablobaww2",
    ],
  },
  {
    id: "cat-vibes",
    title: "Cat Vibes",
    kind: "emote",
    source: "7tv",
    tagline: "Head bobs, stares and very small dances.",
    lore: [
      "catJAM is a white cat (reportedly named Minette) bobbing its head to Jonas Blue\u2019s \u201cI Wanna Dance\u201d, from a TikTok posted in April 2020. Cut out as a transparent emote that July, it became chat\u2019s universal \u201cthis song slaps\u201d.",
      "The rest of the pack is the extended cat cinematic universe: vibing, staring, kissing and dancing cats, mixed from 7TV and emoji.gg.",
    ],
    sources: [{ label: "Know Your Meme: catJAM", url: "https://knowyourmeme.com/memes/catjam" }],
    items: [
      "catJAM", "catKISS", "Catge", "CatVibe", "catRAVE", "catDance", "catHug", "catPls",
      { name: "CatDance", source: "emojigg" }, { name: "bongocat", source: "emojigg" }, { name: "CatHeartEyes", source: "emojigg" },
      { name: "politecat", source: "emojigg" }, { name: "nyancat", source: "emojigg" }, { name: "CattoBlush", source: "emojigg" },
    ],
  },
  {
    id: "hype",
    title: "Party & Hype",
    kind: "emote",
    source: "7tv",
    tagline: "For launches, wins, and anything worth a clap.",
    lore: [
      "The Party Parrot is Sirocco, a kākāpō who became famous in a 2009 BBC clip for, memorably, trying to mate with zoologist Mark Carwardine\u2019s head. His looping head-bob became a Slack staple, and the Cult of the Party Parrot (2016) has collected hundreds of variants since, Party Blob included.",
      "Paired here with chat\u2019s hype regulars: clapping, dancing and the triumphant EZ.",
    ],
    sources: [
      { label: "Know Your Meme: Party Parrot", url: "https://knowyourmeme.com/memes/party-parrot" },
      { label: "Cult of the Party Parrot", url: "https://cultofthepartyparrot.com/" },
    ],
    items: [
      { name: "funkyparrot", source: "emojigg" }, { name: "fast_parrot", source: "emojigg" }, { name: "parrotrave", source: "emojigg" },
      { name: "ThumbsUpParrot", source: "emojigg" }, { name: "partyblob", source: "emojigg" },
      "Clap", "peepoClap", "HYPERS", "EZ", "pepeD", "RainbowPls", "PogU", "catJAM", "PartyKirby",
    ],
  },
  {
    id: "thinking",
    title: "Thinking",
    kind: "emote",
    source: "emojigg",
    tagline: "Hmm. 🤔",
    lore: [
      "The 🤔 Thinking Face arrived with Unicode 8.0 in 2015 and was a full-blown meme by late 2016, used as a sly \u201chmm, suspicious\u201d. Discord servers took it further with distorted, deep-fried versions, spelled \u201cthonk\u201d on purpose.",
    ],
    sources: [{ label: "Know Your Meme: Thinking Face", url: "https://knowyourmeme.com/memes/thinking-face-emoji" }],
    items: [
      "thinksmart", "thonk", "spinthink", "SlavThink", "think_fish", "blobhyperthink", "UltraThink", "CrowThink",
      "ThinkingFast", "Life_is_thonkless", "NopeThink",
    ],
  },
  {
    id: "kanna",
    title: "Kanna Reactions",
    kind: "emote",
    source: "emojigg",
    tagline: "Blank stares and tiny sips from everyone\u2019s favorite small dragon.",
    lore: [
      "Kanna Kamui is the young dragon from Kyoto Animation\u2019s Miss Kobayashi\u2019s Dragon Maid (2017). Her deadpan stares and eating scenes turned into some of Discord\u2019s most-used reaction emotes. This pack sticks to plain reactions.",
    ],
    sources: [{ label: "Know Your Meme: Miss Kobayashi\u2019s Dragon Maid", url: "https://knowyourmeme.com/memes/miss-kobayashis-dragon-maid" }],
    items: [
      "KannaWhat", "KannaSip", "KannaWave", "KannaFreeze", "KannaFu", "kannaPat", "kannabear", "KannaCurious", "KannaPeer",
      "KannaOhh", "KannaBlob", "KannaSpook",
    ],
  },
  {
    id: "reactions-kit",
    title: "Reactions Kit",
    kind: "emote",
    source: "emojigg",
    tagline: "The practical set every server ends up needing.",
    lore: [
      "Yes, no, ping, upvote and pay respects. The small, useful vocabulary that turns reactions into votes, acknowledgements and running jokes.",
    ],
    sources: [],
    items: ["CheckMark", "Nope", "upvote", "ping", "F", "Bonk", "OOF", "no_u", "10outof10", "w", "l", "noU"],
  },
  {
    id: "noto-feelings",
    title: "Animated Feelings",
    kind: "sticker",
    source: "noto",
    tagline: "Google\u2019s animated emoji, as stickers. Fits every server\u2019s 5 free slots.",
    lore: [
      "Google\u2019s Noto Animated Emoji bring the everyday faces to life. Five of the most expressive, sized to fit the five sticker slots every Discord server has before boosting.",
    ],
    sources: [{ label: "Noto Animated Emoji (CC BY 4.0)", url: "https://googlefonts.github.io/noto-emoji-animation/" }],
    items: ["joy", "heart-eyes", "loudly-crying", "partying-face", "melting"],
  },
  {
    id: "fluent-reactions",
    title: "3D Reactions",
    kind: "sticker",
    source: "fluent",
    tagline: "Microsoft\u2019s Fluent emoji in 3D. Five big, friendly reactions.",
    lore: [
      "Microsoft\u2019s Fluent Emoji, released as open source, include a soft 3D style that reads beautifully at sticker size. Five essentials for the base sticker slots.",
    ],
    sources: [{ label: "Fluent Emoji by Microsoft (MIT)", url: "https://github.com/microsoft/fluentui-emoji" }],
    items: ["Thumbs up", "Red heart", "Fire", "Party popper", "Eyes"],
  },
  {
    id: "fluent-celebrate",
    title: "3D Celebrate",
    kind: "sticker",
    source: "fluent",
    tagline: "Trophies, crowns and rockets for the big moments.",
    lore: ["Five 3D Fluent emoji for wins, launches and milestones."],
    sources: [{ label: "Fluent Emoji by Microsoft (MIT)", url: "https://github.com/microsoft/fluentui-emoji" }],
    items: ["Trophy", "Crown", "Rocket", "Sparkles", "Hundred points"],
  },
];
