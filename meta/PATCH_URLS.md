# Branch-Pinned Patch URLs

> **Purpose:** When merging the `v4.4.0-client` branch into `master` for prod, every URL listed below must be flipped from `v4.4.0-client` → `master`. This file is the single source of truth for the find/replace.

## In this repo (`ProdigyOrigin`)

| File | Current value | Replace with |
|------|---------------|--------------|
| `extension/lib/patch-urls.ts` | `https://raw.githubusercontent.com/ProdigyPXP/P-NP/v4.4.0-client/dist/manifest.json` | `https://raw.githubusercontent.com/ProdigyPXP/P-NP/master/dist/manifest.json` |
| `extension/firefox/lib/patch-urls.ts` | `https://raw.githubusercontent.com/ProdigyPXP/P-NP/v4.4.0-client/dist/manifest.json` | `https://raw.githubusercontent.com/ProdigyPXP/P-NP/master/dist/manifest.json` |

## Pre-master checklist

1. Verify `ProdigyPXP/P-NP` has the `v4.4.0-client` branch merged to master and the cron-built `dist/manifest.json` is present on master.
2. In `ProdigyOrigin/v4.4.0-client`, run a single find/replace: `v4.4.0-client` → `master` across `extension/lib/patch-urls.ts` and `extension/firefox/lib/patch-urls.ts` only.
3. Run `pnpm -r typecheck` and `pnpm -r test` from the repo root.
4. Rebuild both extension targets:
   ```bash
   cd extension && pnpm build
   cd ../extension/firefox && pnpm build
   ```
5. Commit:
   ```bash
   git commit -am "release: point v4.4.0 patch URLs at P-NP master"
   ```
6. Merge `v4.4.0-client` → `master`. Tag `v4.4.0`. Publish extension builds.

## Why this file exists

The previous (pre-v4.4.0) extension fetched `game.min.js` directly from P-NP `master` and was always release-ready. Client-side patching introduces a manifest URL that has to be branch-pinned during testing so the live extension doesn't pick up a half-finished manifest. This file makes the branch flip a single, auditable step.
