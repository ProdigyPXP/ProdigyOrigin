# Play Origin — Claude Configuration

Monorepo for modding online math games (formerly modding Prodigy Math Game), maintained by **ProdigyPXP**.

## Detailed Docs

- [Architecture & file structure](.claude/architecture.md)
- [Build, test & workflow](.claude/workflow.md)
- [Screenshot policy](.claude/screenshot-policy.md)

## Critical Rules

1. Use **pnpm**, never npm
2. **No force pushes**, no history rewrites
3. **esbuild** for originGUI, **Plasmo** for extension — no webpack
4. **MV3 only** — use declarativeNetRequest, not webRequest
5. **No remote code on `chrome/packaged-runtime`** — the Chrome build must never fetch-and-run JavaScript, use `onreset`, `eval`, or `new Function`. Hooks live in `extension/lib/runtime/`; the menu is packaged via `extension/contents/menu.ts`. Master keeps the P-NP `onreset` pipeline for Edge/Firefox.
6. **Graceful degradation** — a hook target that stops resolving logs `[Origin] hook target missing: <names>`; the other hooks keep working. A missing target means a Chrome Web Store resubmission.
7. **Prodigy's CSP stays intact** — the Chrome build does not strip it, so anything the menu or DNR loads (images, fonts, fetches) must come from `*.prodigygame.com` or be packaged and web-accessible.
8. **Dev bundle guard** — before committing `originGUI/dist/bundle.js`, confirm it does NOT end with `/* DEV BUNDLE */`; if it does, run `cd originGUI && pnpm build` first

## Branding (Play Origin / Prodigy Origin)

This project rebranded from **Prodigy Origin** to **Play Origin** on 2026-05-06. The full extension/store name is **Play Origin | Math game Mod Hack**.

The legacy name "Prodigy Origin" still appears in URLs and code identifiers — see [`meta/REBRAND.md`](meta/REBRAND.md) for the full list of what stayed and why. Any changes to user-facing branding must be applied consistently across all 4 repos: ProdigyOrigin, P-NP, website, and redirect.
