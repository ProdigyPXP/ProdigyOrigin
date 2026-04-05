import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_start",
  world: "MAIN"
}

const GAME_URL =
  "https://raw.githubusercontent.com/ProdigyPXP/P-NP/patched/game.min.js"

const BUNDLE_URL =
  "https://raw.githubusercontent.com/ProdigyPXP/ProdigyMathGameHacking/master/cheatGUI/dist/bundle.js"

declare global {
  interface Window {
    __PHEX_INJECTED__?: boolean
    SW?: {
      Load?: {
        decrementLoadSemaphore?: () => void
      }
    }
  }
}

// Remove integrity attributes from all scripts and links
function removeIntegrity() {
  console.group("[PHEx] Removing integrity attributes")
  const elements = [
    ...document.getElementsByTagName("script"),
    ...document.getElementsByTagName("link")
  ]
  elements.forEach((el) => {
    if (el.integrity) {
      console.log(`Removed integrity from: ${el.src || el.href}`)
      el.removeAttribute("integrity")
    }
  })
  console.groupEnd()
}

// Inject code using the onreset attribute trick (bypasses CSP)
function injectViaOnreset(code: string) {
  document.documentElement.setAttribute("onreset", code)
  document.documentElement.dispatchEvent(new CustomEvent("reset"))
  document.documentElement.removeAttribute("onreset")
}

// Inject the patched game.min.js
async function injectGame() {
  try {
    const response = await fetch(`${GAME_URL}?updated=${Date.now()}`, {
      cache: "no-store"
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch patched game.min.js: ${response.status}`)
    }

    const gameCode = await response.text()
    
    // Inject game code and decrement load semaphore
    const fullCode = `${gameCode}\nif(window.SW?.Load?.decrementLoadSemaphore){SW.Load.decrementLoadSemaphore();}`
    injectViaOnreset(fullCode)
    
    console.log("[PHEx] Patched game.min.js injected successfully")
  } catch (error) {
    console.error("[PHEx] Failed to inject patched game.min.js", error)
    alert("PHEx: Failed to load hacks. Error:\n" + (error as Error).message)
  }
}

// Inject the cheatGUI bundle
async function injectCheatGUI() {
  try {
    const response = await fetch(`${BUNDLE_URL}?updated=${Date.now()}`, {
      cache: "no-store"
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch cheatGUI bundle: ${response.status}`)
    }

    const bundle = await response.text()
    injectViaOnreset(bundle)
    
    console.log("[PHEx] CheatGUI bundle injected successfully")
  } catch (error) {
    console.error("[PHEx] Failed to inject cheatGUI bundle", error)
  }
}

// Main injection logic
async function main() {
  if (window.__PHEX_INJECTED__) {
    return
  }
  window.__PHEX_INJECTED__ = true

  // Remove integrity attributes immediately and on DOM changes
  removeIntegrity()
  
  const observer = new MutationObserver(() => {
    removeIntegrity()
  })
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })

  // Inject patched game after a short delay
  setTimeout(async () => {
    await injectGame()
    
    // Inject cheatGUI after additional delay for game to initialize
    setTimeout(async () => {
      await injectCheatGUI()
      observer.disconnect()
    }, 2000)
  }, 1000)
}

main()