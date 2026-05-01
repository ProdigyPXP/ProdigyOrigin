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
- Verify DNR rules are active: chrome://extensions → service worker → inspect
