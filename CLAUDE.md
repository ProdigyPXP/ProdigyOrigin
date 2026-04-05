# ProdigyMathGameHacking - Claude Configuration

## Project Overview

ProdigyMathGameHacking (PMGH) is a monorepo for hacking Prodigy Math Game. It is maintained by the **ProdigyPXP** organization (formerly ProdigyPNP — all references to the old org must be replaced).

### Architecture

- **cheatGUI/** — Hack GUI written in TypeScript, bundled with esbuild. Provides a visual cheat menu injected into the Prodigy game page.
- **extension/** — Plasmo-based MV3 Chrome extension (PHEx). Handles:
  - Blocking the original `game.min.js` via declarativeNetRequest
  - Removing CSP/X-Frame-Options headers
  - Injecting patched game code and cheatGUI bundle using the `onreset` attribute trick
  - Custom login background and logo redirects
- **typings/** — Reverse-engineered TypeScript type definitions for Prodigy's game objects
- **meta/** — Documentation, guides, attribution files
- **docs/** — Auto-generated TypeDoc documentation

### Key Technical Details

- **Package manager:** pnpm (NOT npm). Workspace defined in `pnpm-workspace.yaml`.
- **Build tools:** esbuild for cheatGUI, Plasmo for extension
- **Extension injection method:** `document.documentElement.setAttribute("onreset", code)` + `dispatchEvent(new CustomEvent("reset"))` + `removeAttribute("onreset")` — this bypasses CSP restrictions in MV3
- **Content script runs in `world: "MAIN"`** — Plasmo handles this via `chrome.scripting.registerContentScripts()` from the background service worker
- **DNR rules are registered dynamically** in `extension/background.ts` via `chrome.declarativeNetRequest.updateDynamicRules()`

### Related Repos

- **ProdigyPXP/P-NP** — Static patch pipeline. GitHub Action runs every 2 hours, fetches Prodigy game files, patches them, commits to "patched" branch. The extension fetches the patched `game.min.js` from this branch.

## Critical Rules

1. **ZERO references to old organization.** Never use "ProdigyPNP", "afkvido", or "infinitezero.net". Always use "ProdigyPXP" and "alexey-max-fedorov" where appropriate.
2. **Use pnpm**, never npm.
3. **Keep git history** — no force pushes, no history rewrites.
4. **esbuild for cheatGUI**, Plasmo for extension. No webpack.
5. **MV3 only** — no MV2 APIs. Use declarativeNetRequest, not webRequest.
6. **The onreset injection trick is intentional and critical** — do not replace it with script tag injection or other methods. It's the only reliable way to inject code into the MAIN world under MV3 CSP restrictions.
7. **The PHEx/ folder is deleted.** The extension lives in `extension/`. Do not recreate PHEx/.
8. **Graceful degradation** — if patches fail, set `patchDegraded: true` and create a GitHub issue.

## Build Commands

```bash
# Install all workspace dependencies
pnpm install

# Build cheatGUI
cd cheatGUI && pnpm build

# Build extension (Plasmo)
cd extension && pnpm build

# Dev mode for extension
cd extension && pnpm dev
```

## Testing

- Load the unpacked extension from `extension/build/chrome-mv3-dev/` (dev) or `extension/build/chrome-mv3-prod/` (prod)
- Navigate to https://math.prodigygame.com/ to test
- Check browser console for `[PHEx]` log messages
- Verify DNR rules are active in chrome://extensions → service worker → inspect

## File Structure (Key Files)

```
extension/
  background.ts        — Service worker: DNR rules registration
  contents/prodigy.ts  — Content script (world: MAIN): game + cheatGUI injection
  popup.tsx             — Extension popup UI
  package.json          — Plasmo config + manifest overrides
cheatGUI/
  build.mjs            — esbuild build script
  src/index.ts         — Entry point
  dist/bundle.js       — Built output (committed for P-NP to fetch)
typings/
  *.d.ts               — Game type definitions
```
