export const MANIFEST_URL =
  "https://raw.githubusercontent.com/ProdigyPXP/P-NP/master/dist/manifest.json"

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
