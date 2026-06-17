<img width="1400" height="560" alt="Untitled design" src="https://github.com/user-attachments/assets/63fef069-8dff-463f-9aad-2ec779009eb7" />

# Play Origin

**Free, open-source mods & in-game cheat menu for Prodigy Math Game, the online math game.**

> Formerly **Prodigy Origin** — see [`meta/REBRAND.md`](meta/REBRAND.md) for the rebrand summary. The repo name and `prodigyorigin.com` domain stay.

Play Origin is a free, open-source mod menu for **Prodigy Math Game**, delivered as a simple browser extension. It adds a full in-game cheat menu to Prodigy with one click — unlock Members-only pets, gear, and zones, edit your gold, level, and stats, and auto-answer battles. It also works as a general mod loader for other online math games.

> **Looking for a Prodigy hack, a Prodigy mod menu, or free Prodigy Membership?** Play Origin is the ultimate open-source Prodigy Math Game mod and cheat tool — no subscription, no signup, and no data collected.

## [Install](https://extension.playorig.in)

| Browser | Link |
|---------|------|
| Chrome | [chrome.playorig.in](https://chrome.playorig.in/) |
| Firefox | [firefox.playorig.in](https://firefox.playorig.in) |
| Edge | [edge.playorig.in](https://edge.playorig.in) |
| Manual | [Manual install guides](meta/manual/) |

## Features

- Blocks the original game code and loads a patched version with mods enabled
- Removes Content Security Policy restrictions
- Injects the **Play Origin** mod menu into the game
- Configurable custom game/mod bundle URLs via the extension popup
- Custom login background and logo

### Credits

Thank you to DragonX from PXI fusion for providing the following mods:

- Walk Speed
- Disable Battle Timer
- Member Emotes
- Skip Battle Intro
- Player Speed in Battle
- Show Correct Answer
- Free Crafting
- Dark Tower Skip
- Bounty Board Skip
- Quest Skip
- Instant Travel
- Free Morph Marbles

## Components

| Directory | Description |
|-----------|-------------|
| `extension/` | MV3 Chrome extension (Plasmo) — intercepts requests, injects mods |
| `originGUI/` | In-game mod menu (esbuild) — TypeScript + SCSS |
| `typings/` | Reverse-engineered TypeScript types for Prodigy game objects |
| `meta/` | Documentation and install guides |

## Development

```bash
# Install all workspace dependencies
pnpm install

# Build the mod menu
cd originGUI && pnpm build

# Build the extension
cd extension && pnpm build

# Dev mode (extension hot reload)
cd extension && pnpm dev
```

Load the unpacked extension from `extension/build/chrome-mv3-dev/` in Chrome.

Navigate to [math.prodigygame.com](https://math.prodigygame.com/) — press **SHIFT** to toggle the mod menu.

## How it works (v4.4.0)

The extension fetches `manifest.json` from the sibling [P-NP](https://github.com/ProdigyPXP/P-NP)
repo, fetches the original `game.min.js` directly from `code.prodigygame.com`, applies
the manifest's regex find/replace rules locally in the background service worker,
wraps the patched output with the manifest's prefix and suffix, and caches the result
in `chrome.storage.local` keyed by `{gameClientVersion, manifestHash}`. The patched
bundle is then injected into the page via the `onreset` attribute trick.

P-NP's GitHub Action runs every 2 hours, verifies the rules against the latest
Prodigy build, and commits a fresh `manifest.json` whenever rules or wrappers change.
The Firefox build uses a document-rewrite variant of the same pipeline.

## FAQ

**Is Play Origin a Prodigy hack?**
Play Origin is an open-source mod menu (cheat menu) for Prodigy Math Game. It unlocks content the base game locks behind Membership and grinding — Members-only pets, gear, and zones — plus currency, level, and stat editing and battle helpers.

**How do I get free Membership in Prodigy?**
Install the Play Origin browser extension and open Prodigy. The mod menu unlocks Members-only pets, gear, outfits, and zones instantly — no subscription, no payment, no account upgrade needed.

**Is the Prodigy mod menu safe?**
Yes. Play Origin collects no data, never touches your login or password, and is fully open-source — every line that runs in your browser is in this repository. It runs entirely on your own device.

**Does it still work after a Prodigy update?**
Almost always within a couple of hours. P-NP's pipeline re-verifies the patch rules against the latest Prodigy build every 2 hours, and your browser re-patches the current game script locally.

**Is it free?**
Completely. No pro tier, no upsell, no email signup, no ads.

## License

[Mozilla Public License 2.0](LICENSE.txt)

## Links

- [Discord](https://discord.playorig.in)
- [GitHub](https://github.playorig.in)
