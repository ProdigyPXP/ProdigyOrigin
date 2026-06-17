# Chrome Web Store — Play Origin — Privacy & Permission Justifications

These are the answers for the Chrome Web Store "Privacy practices" tab. Each block is sized to fit its field's character limit and can be pasted in verbatim.

> **Covers v4.4.x (client-side patcher).** Starting in v4.4.0 the extension no longer
> downloads a fully pre-built patched bundle. Instead it fetches Prodigy's *own* game
> script at runtime and applies a small set of community-maintained regex patch rules
> to it **locally, in the user's browser**, caching the result. This supersedes the
> v4.3.x justifications. The new behavior adds the `unlimitedStorage` permission and
> broadens the host permission from `math.prodigygame.com` to `*://*.prodigygame.com/*`.

## Single purpose description

> Field limit: 1,000 characters

```
Play Origin injects an in-game mod menu into Prodigy Math Game (math.prodigygame.com). Its single purpose is to enhance that one game: the menu unlocks content, lets players mod their own levels, pets, and inventory, and provides battle helpers. Everything the extension does serves this goal — giving players control over a game that otherwise locks most of its content. It does this by patching Prodigy's own game script locally in the browser, never by reading or modifying any other site.
```

## Permission justification — `scripting`

> Field limit: 1,000 characters

```
The scripting permission registers a MAIN-world content script on math.prodigygame.com via chrome.scripting.registerContentScripts. It needs the MAIN world — not an isolated content script — because it overrides native DOM methods (Document.createElement, Node.appendChild, Node.insertBefore, Element.append, Element.setAttribute) to catch the exact moment Prodigy's own game.min.js script tag is inserted, neutralize it, and inject the locally-patched bundle in its place. Those prototype overrides only take effect in the page's own JavaScript context; an isolated-world script cannot patch the page's prototype chain or reach the live game-engine objects the mod menu binds to. The extension framework (Plasmo) registers the MAIN-world script from the background service worker, which is what requires this permission. No other scripting API is used.
```

## Permission justification — `declarativeNetRequest`

> Field limit: 1,000 characters

```
The declarativeNetRequest permission drives a small set of static rules, all scoped to prodigygame.com, registered at install via updateDynamicRules:

1. BLOCK the original game.min.js request from Prodigy's code.prodigygame.com CDN, so the original and the locally-patched build do not both execute and conflict.

2. MODIFY_HEADERS to strip the Content-Security-Policy and X-Frame-Options response headers on prodigygame.com page frames, so the patched bundle and the mod menu UI can be injected without being blocked by Prodigy's CSP.

3 and 4. REDIRECT the login-screen background image and logo to the extension's own equivalents (a cosmetic re-skin) hosted in the public ProdigyPXP GitHub repository.

The rules match only on URL patterns under prodigygame.com. No browsing history or request content is read, and no other site is affected.
```

## Permission justification — `storage`

> Field limit: 1,000 characters

```
The storage permission persists data locally between sessions via chrome.storage.local. Its main job is caching the locally-patched game bundle: the background service worker fetches Prodigy's own game script, applies the patch rules, and stores the result — keyed by the game's client version and a hash of the patch manifest. On later page loads it serves the cached build instead of re-fetching and re-patching the whole script on every navigation, and rebuilds automatically when either the game version or the patch rules change. It also stores two optional developer-override URLs (originManifestUrl, originGuiUrl) so advanced users can point the extension at a custom build or a fork. Everything is stored locally — nothing is synced and nothing leaves the user's machine. No personal data is stored: the cached content is derived entirely from Prodigy's own publicly served script and the extension's public patch rules.
```

## Permission justification — `unlimitedStorage`

> Field limit: 1,000 characters

```
The unlimitedStorage permission is needed because the cached patched bundle in chrome.storage.local is a full, minified game script that can exceed the default storage quota. Prodigy's game.min.js is a large production JavaScript bundle; after the extension fetches it and applies the patch rules, the resulting build is stored so it does not have to be re-fetched and re-patched on every page load. Without unlimitedStorage the cache write would fail whenever the patched bundle is larger than the default quota, forcing a full rebuild on every single navigation and defeating the cache entirely. No personal data is stored under this quota — the only content written is the patched bundle derived from Prodigy's own publicly served script, plus two short configuration URLs.
```

## Host permission justification

> Field limit: 1,000 characters

```
Host permission for prodigygame.com (*://*.prodigygame.com/*) is required because Prodigy Math Game runs across several prodigygame.com subdomains and the extension's whole purpose is to modify that one game. It is used to inject the mod menu content script on the game page (math.prodigygame.com), to scope the declarativeNetRequest rules to the game's own requests (blocking game.min.js on code.prodigygame.com, stripping CSP headers, re-skinning the login image), and for the background service worker to fetch Prodigy's own original game.min.js so it can be patched locally. Host permission for raw.githubusercontent.com is required so the extension can fetch its patch manifest (regex patch rules) and its mod menu UI bundle from the public ProdigyPXP GitHub repositories at runtime. No other hosts are accessed, and no user data is sent to either domain — both are used purely for read-only fetches and local script injection.
```

## Remote code justification

> Are you using remote code? **Yes** — Field limit: 1,000 characters

```
Play Origin does not download a pre-built patched bundle. It fetches two things and applies patches locally:

1. A patch manifest — a JSON file from the extension's own public GitHub repo (raw.githubusercontent.com, ProdigyPXP): regex find/replace rules plus a small loader prefix/suffix, not executable code. Example: unlock a feature getter so it returns true.

2. Prodigy's own game.min.js — fetched from code.prodigygame.com by the background service worker, the same script its CDN serves every player. A DNR rule blocks it in the tab; the worker fetches it independently because service-worker fetches aren't subject to the extension's DNR rules.

The worker patches it locally and caches the result in chrome.storage.local; the MAIN-world script injects it via the DOM. The mod menu UI is a separate pre-built bundle from the same repo, run in the page. Prodigy updates often, so a pipeline refreshes the manifest every few hours. No user data is sent.
```
