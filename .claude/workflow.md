# Build & Test Workflow

## Build Commands

```bash
# Install all workspace dependencies
pnpm install

# Build originGUI
cd originGUI && pnpm build

# Build extension (Plasmo)
cd extension && pnpm build

# Dev mode for extension
cd extension && pnpm dev
```

## Testing

- Load unpacked extension from `extension/build/chrome-mv3-dev/` (dev) or `extension/build/chrome-mv3-prod/` (prod)
- Navigate to https://math.prodigygame.com/ to test
- Check browser console for `[Origin]` log messages
- Network tab: `code.prodigygame.com/code/*/game.min.js` is 200 (loaded by Prodigy, not blocked)
- Console: `[Origin] packaged runtime active`, three `[Origin] hook installed:` lines, no `hook target missing`, then `[Origin] menu started`
- Console check: `[!!_.instance?.prodigy, _.constants.get("GameConstants.Build.VERSION"), !!_.player?.data, window.__ORIGIN_READY__]`
