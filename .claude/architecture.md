# Architecture

## Packages

- **originGUI/** — In-game mod menu (TypeScript, bundled with esbuild). Injected into the Prodigy game page.
- **extension/** — Plasmo-based MV3 Chrome extension (Prodigy Origin):
  - Blocks original `game.min.js` via declarativeNetRequest
  - Removes CSP/X-Frame-Options headers
  - Injects patched game code + mod menu bundle via the `onreset` attribute trick
  - Custom login background and logo redirects
- **typings/** — Reverse-engineered TypeScript type definitions for Prodigy's game objects
- **meta/** — Documentation, guides

## Key Technical Details

- **Package manager:** pnpm. Workspace defined in `pnpm-workspace.yaml`.
- **Build tools:** esbuild for originGUI, Plasmo for extension
- **Injection method:** `document.documentElement.setAttribute("onreset", code)` + `dispatchEvent(new CustomEvent("reset"))` + `removeAttribute("onreset")` — bypasses MV3 CSP restrictions
- **Content script:** runs in `world: "MAIN"` via `chrome.scripting.registerContentScripts()` from the background service worker
- **DNR rules:** registered dynamically in `extension/background.ts` via `chrome.declarativeNetRequest.updateDynamicRules()`
- **Log prefix:** `[Origin]` in all console output
- **Window globals:** `__ORIGIN_INJECTED__`, `__ORIGIN_REWRITTEN__`, `__ORIGIN_GAME_URL__`, `__ORIGIN_GUI_URL__`
- **DOM attributes:** `data-origin-game-url`, `data-origin-gui-url`, `data-origin-ready`, `data-origin`
- **Storage keys:** `originGameUrl`, `originGuiUrl`

## Related Repos

- **ProdigyPXP/P-NP** — Static patch pipeline. GitHub Action runs every 2 hours, fetches Prodigy game files, patches them, commits to `dist/` on master. The extension fetches the patched `game.min.js` from this repo.

## Key Files

```
extension/
  background.ts           — Service worker: DNR rules registration
  contents/prodigy.ts     — Content script (MAIN world): game + mod menu injection
  contents/origin-bridge.ts — Bridge script (ISOLATED world): URL communication
  popup.tsx               — Extension popup UI
  package.json            — Plasmo config + manifest overrides
originGUI/
  build.mjs               — esbuild build script
  src/index.ts            — Entry point
  dist/bundle.js          — Built output (committed for P-NP to fetch)
typings/
  *.d.ts                  — Game type definitions
```
