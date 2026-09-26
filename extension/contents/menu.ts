import type { PlasmoCSConfig } from "plasmo"
import startOriginMenu from "../../originGUI/dist/menu.js"
import { whenOriginReady } from "../lib/runtime/ready"

export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_idle",
  world: "MAIN"
}

// originGUI reads window._.player at load, so start only once the game is ready.
whenOriginReady(window).then(() => {
  try {
    startOriginMenu()
    console.log("[Origin] menu started")
  } catch (e) {
    console.error("[Origin] menu failed to start:", e)
  }
})
