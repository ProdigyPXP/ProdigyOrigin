import type { PlasmoCSConfig } from "plasmo"

/**
 * PHEx Bridge — Isolated World Content Script
 *
 * Runs in Chrome's ISOLATED world (has access to chrome.* APIs).
 * Passes the extension's game.min.js URL to the MAIN world content script
 * via a data attribute on <html>. This is needed because MAIN world scripts
 * cannot access chrome.runtime.getURL().
 */
export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_start"
  // No world: "MAIN" — defaults to ISOLATED world
}

// Pass the extension URL to the page via DOM attribute
const gameUrl = chrome.runtime.getURL("assets/game.min.js")
document.documentElement.setAttribute("data-phex-game-url", gameUrl)
