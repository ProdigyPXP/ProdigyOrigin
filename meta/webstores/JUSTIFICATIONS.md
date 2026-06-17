# Chrome Web Store — Play Origin — Privacy & Permission Justifications

These are the answers for the Chrome Web Store "Privacy practices" tab. Each block is sized to fit its field's character limit and can be pasted in verbatim.

## Single purpose description

> Field limit: 1,000 characters

```
Play Origin injects an in-game mod menu into Prodigy Math Game (math.prodigygame.com) that unlocks game content, lets players mod their own currency, levels, pets, and inventory, and provides battle helpers. The extension's single purpose is to enhance the Prodigy Math Game experience. Everything the extension does serves this one goal: giving players control over a game that otherwise locks most of its content.
```

## Permission justification — `scripting`

> Field limit: 1,000 characters

```
The scripting permission is required to inject the mod menu and the patched game bundle into the Prodigy Math Game page at runtime. Specifically, the extension uses chrome.scripting.registerContentScripts to register a MAIN-world content script that runs on math.prodigygame.com. The MAIN world is necessary because the mod menu must access the same JavaScript context as Prodigy's game engine in order to read and modify game state objects, hook into battle logic, and expose UI controls bound to live game data. An ISOLATED-world script cannot reach these objects.
```

## Permission justification — `declarativeNetRequest`

> Field limit: 1,000 characters

```
The declarativeNetRequest permission is required for two reasons. First, the extension blocks the original game.min.js request from Prodigy's CDN so it can be replaced with the community-patched version that exposes the game's internal systems to the mod menu. Without blocking the original script, both versions would load simultaneously and conflict. Second, the extension removes Content-Security-Policy and X-Frame-Options response headers on math.prodigygame.com so that the patched game bundle and mod menu UI can be injected into the page without being blocked by Prodigy's CSP. These rules are registered dynamically at runtime via chrome.declarativeNetRequest.updateDynamicRules and apply only to the Prodigy Math Game domain. No other sites are affected.
```

## Permission justification — `storage`

> Field limit: 1,000 characters

```
The storage permission is required to persist a small amount of configuration data between browser sessions. Specifically, the extension stores the URLs it uses to fetch the patched game bundle (originGameUrl) and the mod menu UI bundle (originGuiUrl) so users can point the extension at a custom build or a fork if they want to. It also stores user preferences for the mod menu itself, such as which tabs were last open, where the menu was positioned on screen, and which features were toggled on or off, so the menu state survives page reloads and browser restarts. All data is stored locally via chrome.storage.local. Nothing is synced to any external server, and nothing is transmitted off the user's machine.
```

## Host permission justification

> Field limit: 1,000 characters

```
Host permission for math.prodigygame.com is required because that is the only website Prodigy Math Game runs on, and the entire purpose of this extension is to modify that specific game. The host permission allows the extension to inject the mod menu content script, register declarativeNetRequest rules scoped to the game's network requests, and read the page context needed to overlay the menu on top of the running game. Host permission for raw.githubusercontent.com is required so the extension can fetch the community-patched game bundle from the public ProdigyPXP/P-NP repository at runtime. No other hosts are accessed, and no user data is sent to either domain — both permissions are used exclusively for read-only fetches and local script injection.
```

## Remote code justification

> Are you using remote code? **Yes** — Field limit: 1,000 characters

```
Play Origin fetches one remote JavaScript file at runtime: a community-patched build of Prodigy Math Game's own game script, hosted in the public ProdigyPXP/P-NP repository on GitHub. This file is required to load the game mods. Prodigy frequently updates their game, and the patched build must be regenerated and refreshed every couple of hours by an automated pipeline to stay compatible — bundling a static copy inside the extension would mean the mods break within hours of every Prodigy update and stay broken until a new extension version clears review. Fetching the patched build from a version-pinned, publicly auditable GitHub repository is the only way to keep the mods working reliably. The fetched script is scoped to math.prodigygame.com only, runs entirely in the user's browser, and transmits no user data anywhere.
```
