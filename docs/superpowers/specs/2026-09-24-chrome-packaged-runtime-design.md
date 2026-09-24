# Chrome packaged runtime (no remote code)

Branch: `chrome/packaged-runtime`. Master stays on the P-NP `manifest.json` + `onreset` pipeline so the Edge and Firefox listings keep fast-patching. This branch is the Chrome Web Store build only.

Background: `../GIZMO_MIGRATION.md` (workspace root). Blue Argon = executing JavaScript that was not in the reviewed package.

## Goal

Prodigy loads its own, unmodified `game.min.js`. Every line of JavaScript Play Origin runs ships inside the extension zip. No `fetch` + `eval`, no `onreset`, no prefix/suffix from GitHub.

Success criteria:

1. With the dev extension loaded, `math.prodigygame.com` loads the original `game.min.js` from `code.prodigygame.com` (network tab: 200, not blocked).
2. `window._.instance.prodigy`, `_.constants.get("GameConstants.Build.VERSION")`, `_.player`, `_.network` and `_.membership` resolve.
3. With `GameConstants.Debug.EDUCATION_ENABLED` false, a battle question auto-answers through each of the three bypasses (battle `OpenQuestionInterface`, `AnswerQuestion` action, Tower Town).
4. The menu opens, and Shift still toggles it.
5. `grep -rE "eval\(|new Function|onreset|raw\.githubusercontent" extension/build/chrome-mv3-prod` finds nothing written by Play Origin.

## Why hooks work here

`game.min.js` is one webpack bundle. Its runtime tags every ESM exports object via `Object.defineProperty(exports, Symbol.toStringTag, {value: "Module"})`. A MAIN-world content script at `document_start` wraps `Object.defineProperty`, keeps a list of those exports objects, and passes everything else straight through. Targets are resolved lazily, after the game boots, by name or shape. Module ids are never used.

| Old P-NP rule | Packaged replacement |
|---|---|
| `singleton-exposure` | Export that is a class with a static `instance` getter and a `prodigy` prototype getter (module 35120 `q` today). `_.instance` = `q.instance`. |
| `expose-constants` | Export whose `.constants` object has key `"GameConstants.Build.VERSION"` (module 34829 today). Same Map-like `get`/`set`/`has` + `.constants` self-alias as the old suffix. |
| `answer-question-bypass` | Component registry (export object with key `OpenQuestionInterface`, filled by the `EV(name, path)` decorator). Wrap `OpenQuestionInterface.prototype.answerQuestion`. |
| `external-factory-bypass` | Action registry (export object with key `AnswerQuestion`, filled by `ba9(name)`). Wrap `AnswerQuestion.prototype.execute`; bypass calls `this.finish({answerCorrect, responseTime: 0})`. |
| `open-question-bypass` | Exported class whose prototype has `openQuestionInterfaceThenEmitNotifications` (module 82142 `gT` today). Wrap it; bypass calls the callback `(true, 10, 1, false, false, {})`. |
| `safe-bind`, semaphore guard | Dropped. They only guarded against `onreset` running the game twice. |

Each bypass has the same gate as the old regex: active only when `_.constants.get("GameConstants.Debug.EDUCATION_ENABLED")` is falsy, correct with probability `AUTO_ANSWER_CORRECT_PERCENT` (default 1). Otherwise the original method runs.

Registry keys are prefab serialization names, so minification can't rename them. Method names were already what the regex rules depended on.

## Components

- **`extension/lib/runtime/`**: pure, testable modules.
  - `modules.ts`: `defineProperty` hook + the captured-exports list.
  - `resolve.ts`: `findSingletonClass`, `findConstants`, `findRegistry(key)`, `findClassWithMethod(name)`, each taking the exports list.
  - `bypasses.ts`: the three prototype wraps. Idempotent, marked with a symbol so they never double-wrap.
  - `api.ts`: builds the `window._` surface ported from P-NP `wrappers.ts` (`instance`, `constants`, `player`, `network`, `gameData`, `localizer`, `membership`, `hack`, `functions.escapeBattle`, `functions.setMembership`, `__pnp_discoverService`). It re-applies itself when lodash replaces `window._`, same as the old 500 ms poll. When the singleton and constants are resolved, it dispatches `origin:ready` on `window`.
- **`extension/contents/runtime.ts`**: MAIN world, `document_start`, `https://math.prodigygame.com/*`. Installs the hook, then the API and bypasses once resolution succeeds. If a target is still missing after the game boots, it logs `[Origin] hook target missing: <name>` and continues with what it has (graceful degradation).
- **`extension/contents/menu.ts`**: MAIN world, `document_idle`. Imports the built originGUI bundle so the menu code sits inside the content script. Waits for `origin:ready` before running the menu.
- **originGUI changes** (on this branch only): remove "Update menu", the beta branch loader, the eval console, and the dev socket `eval`. Replace the template-string `eval`s in `player.ts` and `pets.ts` with closures. Data `fetch`es (status message JSON, Prodigy API, asset URLs) stay; they load data, not code.

## Removed from the Chrome extension

`background.ts` patch pipeline (the service worker keeps only the DNR image redirects), `contents/prodigy.ts`, `contents/origin-bridge.ts`, `lib/{bundle-cache,manifest,patches,patch-urls}.ts` and their tests, DNR rules 1 (block `game.min.js`) and 2 (strip CSP/XFO; MAIN-world content scripts aren't subject to page CSP), the `raw.githubusercontent.com` host permission, the popup's manifest/menu URL overrides, and the `unlimitedStorage` permission.

The image redirects to GitHub-hosted PNGs stay. They're images, not code.

## Testing

- Unit (node test runner, like the existing tests): run `resolve.ts` and `bypasses.ts` against fixtures that copy the real shapes (a fake exports list with a registry object, a class with a static `instance` getter, and so on). Cover idempotent wrapping, the gate on/off, and a missing-target log.
- No offline run of the real `game.min.js`: it needs a real DOM and a Phaser boot. Live verification covers it.
- Live: `pnpm dev`, load `extension/build/chrome-mv3-dev` unpacked, then walk through success criteria 1–5.

## Out of scope

- Firefox and Edge (stay on master).
- P-NP becoming a CI check that loads the latest `game.min.js` and asserts every hook target resolves. That's the next spec once the hooks are proven live.
- Store listing text and version bump.
