# Prodigy Origin — Claude Configuration

Monorepo for modding Prodigy Math Game, maintained by **ProdigyPXP**.

## Detailed Docs

- [Architecture & file structure](.claude/architecture.md)
- [Build, test & workflow](.claude/workflow.md)
- [Screenshot policy](.claude/screenshot-policy.md)

## Critical Rules

1. Use **pnpm**, never npm
2. **No force pushes**, no history rewrites
3. **esbuild** for originGUI, **Plasmo** for extension — no webpack
4. **MV3 only** — use declarativeNetRequest, not webRequest
5. The **`onreset` injection trick** is intentional and critical — do not replace it with script tags or other methods
6. **Graceful degradation** — if patches fail, set `patchDegraded: true` and open a GitHub issue
7. **Dev bundle guard** — before committing `originGUI/dist/bundle.js`, confirm it does NOT end with `/* DEV BUNDLE */`; if it does, run `cd originGUI && pnpm build` first

## Branding (Play Origin / Prodigy Origin)

This project rebranded from **Prodigy Origin** to **Play Origin** on 2026-05-06. The full extension/store name is **Play Origin | Math game Mod Hack**.

The legacy name "Prodigy Origin" still appears in URLs and code identifiers — see [`meta/REBRAND.md`](meta/REBRAND.md) for the full list of what stayed and why. Any changes to user-facing branding must be applied consistently across all 4 repos: ProdigyOrigin, P-NP, website, and redirect.
