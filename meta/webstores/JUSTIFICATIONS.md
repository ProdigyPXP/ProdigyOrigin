# Chrome Web Store — Play Origin — Privacy & Permission Justifications

These are the answers for the Chrome Web Store "Privacy practices" tab. Each block is sized to fit its field's character limit and can be pasted in verbatim.

> **Covers v4.5.x (Chrome Web Store exclusive, branch `chrome/packaged-runtime`).**
> v4.5.0 runs no remote code. Prodigy loads its own, unmodified game script; all of
> Play Origin's JavaScript (the game hooks and the mod menu) ships inside the package.
> Nothing is fetched and executed, nothing is patched in source, and Prodigy's CSP is
> left intact. Compared with v4.4.x this drops the `storage` and `unlimitedStorage`
> permissions, the `raw.githubusercontent.com` host permission, the game-script BLOCK
> rule and the CSP-stripping rule, and changes "Are you using remote code?" to **No**.
> Edge and Firefox stay on the v4.4.x pipeline (master); their justifications live there.

## Single purpose description

> Field limit: 1,000 characters

```
Play Origin adds an in-game mod menu to Prodigy Math Game (math.prodigygame.com). Its single purpose is to enhance that one game: the menu unlocks content, lets players mod their own levels, pets, and inventory, and provides battle helpers. Everything the extension does serves this goal. It works by running packaged scripts alongside Prodigy's own, unmodified game code on the game page, and it never reads or modifies any other site.
```

## Permission justification — `scripting`

> Field limit: 1,000 characters

```
The extension framework (Plasmo) registers two content scripts in the page's MAIN world on math.prodigygame.com via chrome.scripting.registerContentScripts, which is what requires this permission. Both scripts are part of the extension package; no code is downloaded.

1. A runtime script at document_start. It observes the game's own modules as they load (by wrapping Object.defineProperty) and adds small wrappers around a few of the game's methods, such as answering a question automatically when the player turns that option on.

2. The mod menu UI at document_idle, started once the game is ready.

They must run in the MAIN world because they work with the live objects of Prodigy's JavaScript engine, which an isolated-world content script cannot reach. No other scripting API is used.
```

## Permission justification — `declarativeNetRequest`

> Field limit: 1,000 characters

```
The declarativeNetRequest permission drives two REDIRECT rules, registered at install via updateDynamicRules. They swap the game's login-screen background image and logo for Play Origin artwork, a purely cosmetic re-skin. Both rules redirect to images packaged inside the extension (extensionPath, declared in web_accessible_resources for prodigygame.com only).

The rules match only two image URL patterns under prodigygame.com. They do not block requests, do not modify headers, do not touch scripts, and do not read browsing history or request content. No other site is affected.
```

## Host permission justification

> Field limit: 1,000 characters

```
Host permission for prodigygame.com (*://*.prodigygame.com/*) is required because Prodigy Math Game is served across several prodigygame.com subdomains and the extension's whole purpose is to modify that one game. It is used to run the packaged content scripts on the game page (math.prodigygame.com) and to apply the two cosmetic image redirects to the game's own login background (cdn.prodigygame.com) and logo (code.prodigygame.com). No other hosts are requested. The extension sends no user data anywhere and does not fetch any code.
```

## Remote code justification

> Are you using remote code? **No**

No justification is required when answering No. For reviewers' reference: every script the extension executes (`runtime.*.js`, `menu.*.js`, the popup and the background service worker) is in the submitted package. The extension contains no `eval`, no `new Function`, and no code loaded from a URL. The only network requests the mod menu makes are JSON calls to Prodigy's own API (`api.prodigygame.com`) to save and load the player's character.

## Data usage

- Collects no user data. No analytics, no telemetry, no remote logging.
- Stores nothing: the extension requests no storage permission.
