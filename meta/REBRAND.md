# Rebrand: Prodigy Origin → Play Origin

This project was originally launched as **Prodigy Origin**. As of 2026-05-06, the user-facing brand is **Play Origin** (extension store listing name: *Play Origin | Math game Mod Hack*). The rebrand re-positions the loader for online math games generally, rather than only Prodigy Math Game.

## What changed

- All user-facing text (extension manifest, popup, in-game mod menu title, website, README intros, privacy policy) now reads "Play Origin".
- Tagline and feature copy generalize to "online math games" / "math game" where mechanically possible.
- Internal Claude/dev docs were swept for consistency.

## What stayed (and why)

- **Repo names** — `ProdigyPXP/ProdigyOrigin` and `ProdigyPXP/P-NP`. Renaming GitHub repos breaks every external link, `raw.githubusercontent.com` URL, `git clone` path, and the originGUI auto-update fetcher.
- **Domain `prodigyorigin.com`** — same reasoning. SEO equity, store-listing destinations, and the entire `redirect/` Vercel config are pinned to this domain.
- **GitHub organization usernames** — `ProdigyPXP` (org), `dsc.gg/ProdigyPXP` (Discord vanity), and personal collaborator usernames stay.
- **Code-level identifiers** — `originGUI/` directory, `#origin-menu` div ID, `data-origin-game-url` attribute, `originGameUrl` / `originGuiUrl` `chrome.storage.local` keys, all `window.__PNP__*` globals, and the `%cP-NP Patcher` DevTools banner. Renaming any of these would either break repo paths or require a storage-migration shim. The `[P-NP]` console log prefix is the one exception — rebranded to `[Play Origin]` because it's the most visible technical string a user sees in DevTools.
- **Asset filenames** — `origin-bg.png`, `origin-logo.png`, `logo.png`. The binary contents may be swapped (logo refresh is in progress out-of-band) but the filenames are referenced by DNR rules and `Image` components.
- **`meta/webstores/*.md`** — store-listing copy will be rewritten on the next round of store submissions, separately from this rebrand.
- **`Prodigy Education Inc.`** — appears in the privacy policy's affiliation disclaimer; that's the actual legal entity name and must stay verbatim.

## Reading old material

If you find "Prodigy Origin" in:
- a URL → it's the legacy brand, expected, not a typo
- a hardcoded GitHub or `raw.githubusercontent.com` link → stays per "repo names + org names" rule
- store-listing copy under `meta/webstores/` → those will be rewritten when stores are re-submitted
- elsewhere → open an issue, it's a missed string

## Version

The rebrand ships as **v4.3.0** across `extension/`, `extension/firefox/`, `originGUI/`, `typings/`, and the sibling `P-NP` repo (synchronized via the project `version-sync` skill).
