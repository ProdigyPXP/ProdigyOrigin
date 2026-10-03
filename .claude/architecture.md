# Architecture

## Packages

- **originGUI/** — In-game mod menu (TypeScript, bundled with esbuild). `build.mjs` also emits `dist/menu.js` (gitignored): the bundle wrapped as `export default function startOriginMenu()` so the extension can package it.
- **extension/** — Plasmo-based MV3 Chrome extension (Play Origin). On branch `chrome/packaged-runtime` it runs no remote code:
  - Prodigy loads its own, unmodified `game.min.js`
  - `contents/runtime.ts` (MAIN world, `document_start`) wraps `Object.defineProperty` to capture webpack export objects, resolves hook targets by shape/name, installs the education bypasses and builds `window._`
  - `contents/menu.ts` (MAIN world, `document_idle`) runs the packaged originGUI on `origin:ready`
  - `background.ts` only registers two DNR redirects that swap the login background and logo for packaged, web-accessible art
  - Prodigy's CSP is left intact
  - Master still ships the old P-NP `manifest.json` + `onreset` pipeline for Edge/Firefox
- **typings/** — Reverse-engineered TypeScript type definitions for Prodigy's game objects
- **meta/** — Documentation, guides

## Key Technical Details

- **Package manager:** pnpm. Workspace defined in `pnpm-workspace.yaml`.
- **Build tools:** esbuild for originGUI, Plasmo for extension
- **Content scripts:** Plasmo registers the MAIN-world scripts with `chrome.scripting.registerContentScripts()` from the service worker
- **DNR rules:** registered dynamically in `extension/background.ts` via `chrome.declarativeNetRequest.updateDynamicRules()` (ids 3, 4: `extensionPath` redirects)
- **Log prefix:** `[Origin]` in all console output
- **Window globals:** `_` (lodash, plus Play Origin's `instance`, `constants`, `player`, `network`, `gameData`, `membership`, `functions.setMembership`), `__ORIGIN_READY__`
- **Events:** `origin:ready` on `window`

### Hook targets (`extension/lib/runtime/resolve.ts`)

| Target | Found by | Used for |
|---|---|---|
| `singletonClass` | class with static `instance` getter and `prodigy` prototype getter | `_.instance`, service discovery |
| `constants` | `.constants` object owning `"GameConstants.Build.VERSION"` | `_.constants`, bypass gate |
| `componentRegistry` | object whose `OpenQuestionInterface` is a class (`EV()` decorator registry) | battle question bypass |
| `baseActionClass` | class whose prototype owns `init`, `execute`, `finish`, `findParameter`, `validateParameters` | `AnswerQuestion` action bypass |
| `towerTownClass` | class owning `openQuestionInterfaceThenEmitNotifications` | Tower Town bypass |

## Related Repos

- **ProdigyPXP/P-NP** — Static patch pipeline. GitHub Action runs every 2 hours, fetches Prodigy game files, patches them, commits to `dist/` on master. The extension fetches the patched `game.min.js` from this repo.

## Key Files

```
extension/
  background.ts           — Service worker: DNR login-art redirects only
  contents/runtime.ts     — MAIN world, document_start: hook + resolve + bypasses + window._
  contents/menu.ts        — MAIN world, document_idle: starts packaged originGUI on origin:ready
  popup.tsx               — Extension popup UI
  package.json            — Plasmo config + manifest overrides
  assets/origin-*.png     — Packaged login background and logo (web-accessible)
  lib/runtime/
    modules.ts             — defineProperty hook capturing webpack export objects
    resolve.ts             — hook target resolvers
    bypasses.ts            — education bypass prototype wraps
    api.ts                 — window._ API (ported from P-NP wrappers.ts)
    ready.ts               — origin:ready signal
  tests/                   — unit tests (node --test)
originGUI/
  build.mjs               — esbuild build script
  src/index.ts            — Entry point
  dist/bundle.js          — Built output (committed for P-NP to fetch)
typings/
  *.d.ts                  — Game type definitions
```
