// All URLs that are pinned to the v4.4.0-client working branch. Before merging
// v4.4.0-client into master, replace "v4.4.0-client" with "master" in this file
// (and the equivalent file in extension/firefox/lib/patch-urls.ts).
// See: meta/PATCH_URLS.md
export const MANIFEST_URL =
  "https://raw.githubusercontent.com/ProdigyPXP/P-NP/v4.4.0-client/dist/manifest.json"

// Matches canonical Prodigy game URL: //code.prodigygame.com/code/<version>/game.min.js
// Optional query string follows.
export const GAME_SCRIPT_RE =
  /\/\/code\.prodigygame\.com\/code\/([^/]+)\/game\.min\.js(?:\?|#|$)/i

export const isGameScriptSrc = (src: string | null | undefined): boolean => {
  if (!src) return false
  return GAME_SCRIPT_RE.test(src)
}

export const gameVersionFromUrl = (url: string): string => {
  if (!url) return ""
  const m = url.match(GAME_SCRIPT_RE)
  return m?.[1] ?? ""
}
