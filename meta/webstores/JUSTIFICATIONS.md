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
Play Origin injects an in-game mod menu into Prodigy Math Game (math.prodigygame.com) that unlocks game content, lets players mod their own game experience, levels, pets, and inventory, and provides battle helpers. The extension's single purpose is to enhance the Prodigy Math Game experience. Everything the extension does serves this one goal: giving players control over a game that otherwise locks most of its content.
```

## Permission justification — `scripting`

> Field limit: 1,000 characters

```
The scripting permission is required to register a MAIN-world content script via chrome.scripting.registerContentScripts on math.prodigygame.com. The MAIN world is necessary because this script overrides native DOM methods (Document.createElement, Node.appendChild, Node.insertBefore, Element.append, Element.setAttribute) to intercept the exact moment Prodigy's game.min.js script tag is inserted, neutralize it, and inject the locally-patched bundle in its place. These prototype overrides only take effect when the script runs in the page's own JavaScript context; an ISOLATED-world script cannot patch the page's prototype chain or reach the live game-engine objects the mod menu binds to. The extension framework (Plasmo) registers MAIN-world scripts from the background service worker using chrome.scripting.registerContentScripts(), which requires this permission. No other scripting API is used.
```

## Permission justification — `declarativeNetRequest`

> Field limit: 1,000 characters

```
The declarativeNetRequest permission is used for a small set of rules, all scoped to prodigygame.com, registered at install time via updateDynamicRules. (1) BLOCK the original game.min.js request from Prodigy's code.prodigygame.com CDN, so the original and the locally-patched build do not both execute and conflict. (2) MODIFY_HEADERS to remove the Content-Security-Policy and X-Frame-Options response headers on prodigygame.com page frames, so the patched game bundle and the mod menu UI can be injected without being blocked by Prodigy's CSP. (3) and (4) REDIRECT the game's login-screen background image and logo to the extension's own equivalents (a cosmetic re-skin) hosted in the public ProdigyPXP GitHub repository. The rules match only on URL patterns under prodigygame.com; no browsing history or request content is read, and no other site is affected.
```

## Permission justification — `storage`

> Field limit: 1,000 characters

```
The storage permission persists data locally between sessions via chrome.storage.local. Its main use is caching the locally-patched game bundle: the background service worker fetches Prodigy's own game script, applies the patch rules to it, and stores the result, keyed by the game's client version and a hash of the patch manifest. On later page loads it serves the cached bundle instead of re-fetching and re-patching the whole script on every navigation, and rebuilds automatically when either the game version or the patch rules change. It also stores two optional developer-override URLs (originManifestUrl, originGuiUrl) so advanced users can point the extension at a custom build or a fork. All data is stored locally; nothing is synced and nothing is transmitted off the user's machine. No personal data is stored — the cached content is derived entirely from Prodigy's own publicly served script and the extension's public patch rules.
```

## Permission justification — `unlimitedStorage`

> Field limit: 1,000 characters

```
The unlimitedStorage permission is required because the cached patched bundle stored in chrome.storage.local is a full, minified game script that can exceed the default storage quota. Prodigy's game.min.js is a large production JavaScript bundle; after the extension fetches it and applies the patch rules, the resulting build is stored so it does not have to be re-fetched and re-patched on every page load. Without unlimitedStorage the cache write would fail whenever the patched bundle is larger than the default quota, forcing the extension to rebuild the entire bundle on every single navigation and defeating the caching mechanism entirely. No personal data is stored under this quota — the only content written is the patched bundle derived from Prodigy's own publicly served script, plus two short configuration URLs.
```

## Host permission justification

> Field limit: 1,000 characters

```
Host permission for prodigygame.com (*://*.prodigygame.com/*) is required because Prodigy Math Game runs across several prodigygame.com subdomains and the entire purpose of this extension is to modify that specific game. It is needed to inject the mod menu content script on the game page (math.prodigygame.com), to scope the declarativeNetRequest rules to the game's own requests (blocking game.min.js on code.prodigygame.com, stripping CSP headers, re-skinning the login image), and for the background service worker to fetch Prodigy's own original game.min.js so it can be patched locally. Host permission for raw.githubusercontent.com is required so the extension can fetch its patch manifest (regex patch rules) and its mod menu UI bundle from the public ProdigyPXP GitHub repositories at runtime. No other hosts are accessed, and no user data is sent to either domain — both are used exclusively for read-only fetches and local script injection.
```

## Remote code justification

> Are you using remote code? **Yes** — Field limit: 1,000 characters

```
Yes. Play Origin loads remote code in two scoped, publicly-auditable ways, both from the public ProdigyPXP GitHub repositories. (1) The mod menu UI bundle — the Play Origin menu itself — is fetched at runtime and run in the page. (2) A patch manifest (a JSON file of regex find/replace rules plus a small loader prefix/suffix) is fetched and used to patch Prodigy's game script. The patched build is assembled on the user's own machine from the exact game.min.js Prodigy's CDN serves to every player (fetched at runtime) plus these locally-applied rules — not a pre-built blob. Prodigy ships frequent game updates, so an automated pipeline refreshes the patch manifest every couple of hours to keep the rules matching the latest build; bundling a static copy would break the mods within hours of every update and keep them broken until a new version cleared review. Everything runs in the user's browser and transmits no user data.
```
