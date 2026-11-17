<div align="center">

<img src="public/logo.png" width="72" alt="" />

# Emoteger

Manage your Discord server's emotes and stickers from the web.

</div>

## Features

- Upload, rename, copy, download and delete emotes and stickers
- Bulk delete that respects Discord's rate limits
- Browse emoji.gg, 7TV, Noto and Fluent, and add straight to your server
- Curated packs you can add in one go or download as a .zip
- Command menu on <kbd>⌘</kbd> <kbd>K</kbd>

## Setup

Create an application in the [Discord Developer Portal](https://discord.com/developers/applications), add a bot, and add `http://localhost:3000/api/auth/callback` as an OAuth2 redirect.

```bash
cp .env.example .env   # fill in the values
bun install
bun dev
```

Then open [localhost:3000](http://localhost:3000).

## Scripts

```bash
bun dev             # development server
bun run build       # production build
bun start           # production server
bun run typecheck   # type check
bun run packs       # rebuild src/data/packs.json from scripts/packs/spec.ts
```

## Credits

Emotes from [emoji.gg](https://emoji.gg) and [7TV](https://7tv.app) belong to their creators. [Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/) by Google (CC BY 4.0). [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) by Microsoft (MIT). Icons by [IconMCP](https://iconmcp.com) (MIT).

Not affiliated with Discord.

## License

[MIT](LICENSE)
