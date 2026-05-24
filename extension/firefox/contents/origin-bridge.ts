import type { PlasmoCSConfig } from "plasmo"
import { MANIFEST_URL } from "../lib/patch-urls"

/**
 * Play Origin Bridge (Firefox) — ISOLATED world.
 *
 * Sets `data-origin-manifest-url` and `data-origin-gui-url` synchronously so
 * the MAIN-world script can read them before document.write. Reads optional
 * overrides from chrome.storage.local, then signals readiness with
 * `data-origin-ready="1"`.
 */
export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_start"
}

document.documentElement.setAttribute("data-origin-manifest-url", MANIFEST_URL)
document.documentElement.setAttribute("data-origin-gui-url", "")

chrome.storage.local.get(
  ["originManifestUrl", "originGuiUrl"],
  (result) => {
    if (chrome.runtime.lastError) {
      console.warn("[Origin] storage error:", chrome.runtime.lastError.message)
      document.documentElement.setAttribute("data-origin-ready", "1")
      return
    }
    if (
      typeof result.originManifestUrl === "string" &&
      result.originManifestUrl.length > 0
    ) {
      document.documentElement.setAttribute(
        "data-origin-manifest-url",
        result.originManifestUrl
      )
    }
    if (
      typeof result.originGuiUrl === "string" &&
      result.originGuiUrl.length > 0
    ) {
      document.documentElement.setAttribute(
        "data-origin-gui-url",
        result.originGuiUrl
      )
    }
    document.documentElement.setAttribute("data-origin-ready", "1")
  }
)
