import type { PlasmoCSConfig } from "plasmo"
import { MANIFEST_URL } from "../lib/patch-urls"

/**
 * Play Origin Bridge (Firefox) — ISOLATED world.
 *
 * Sets `data-origin-manifest-url` synchronously so the MAIN-world script
 * can read it before document.write. Optionally reads chrome.storage.local
 * for a dev override, then sets `data-origin-ready="1"`.
 */
export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_start"
}

document.documentElement.setAttribute("data-origin-manifest-url", MANIFEST_URL)

chrome.storage.local.get(["originManifestUrl"], (result) => {
  if (chrome.runtime.lastError) {
    console.warn("[Origin] storage error:", chrome.runtime.lastError.message)
    document.documentElement.setAttribute("data-origin-ready", "1")
    return
  }
  if (typeof result.originManifestUrl === "string" && result.originManifestUrl.length > 0) {
    document.documentElement.setAttribute("data-origin-manifest-url", result.originManifestUrl)
  }
  document.documentElement.setAttribute("data-origin-ready", "1")
})
