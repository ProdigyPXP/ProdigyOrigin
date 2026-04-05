import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_start",
  world: "MAIN"
}

declare global {
  interface Window {
    __PHEX_INJECTED__?: boolean
    __PHEX_REWRITTEN__?: boolean
    __PHEX_GAME_URL__?: string
  }
}

/**
 * PHEx Content Script — SRI Bypass via Document Rewrite + Direct URL Replacement
 *
 * Root cause: game.min.js <script> tag is in the initial HTML with integrity
 * set by the HTML parser at the C++ level. Additionally, DNR extensionPath
 * redirects create "pending" requests that never complete.
 *
 * Solution:
 * 1. Bridge script (ISOLATED world) passes extension game URL via data attribute
 * 2. This script (MAIN world) re-fetches page HTML via sync XHR
 * 3. Strips ALL integrity attributes from the HTML
 * 4. REPLACES game.min.js URL with the extension's direct chrome-extension:// URL
 * 5. Rewrites document via document.open() + document.write()
 * 6. The HTML parser loads our patched game directly from the extension (no redirect!)
 */

// ─── Save originals ───
const origAppendChild = Node.prototype.appendChild
const origInsertBefore = Node.prototype.insertBefore
const origAppend = Element.prototype.append
const origRemoveAttribute = Element.prototype.removeAttribute
const origSetAttribute = Element.prototype.setAttribute
const origGetAttribute = Element.prototype.getAttribute
const origCreateElement = Document.prototype.createElement

// ─── Read extension URL from bridge (set by phex-bridge.ts in ISOLATED world) ───
;(function readBridgeUrl() {
  // The bridge script sets data-phex-game-url on <html>
  // Poll briefly in case of race condition
  for (let i = 0; i < 200; i++) {
    const url = document.documentElement?.getAttribute("data-phex-game-url")
    if (url) {
      window.__PHEX_GAME_URL__ = url
      console.log("[PHEx] Extension game URL:", url)
      return
    }
  }
  console.warn("[PHEx] Could not read extension game URL from bridge")
})()

// ─── Phase 1: Document Rewrite ───
;(function rewriteDocument() {
  if (window.__PHEX_REWRITTEN__) return
  window.__PHEX_REWRITTEN__ = true

  // Only rewrite the /load page
  if (!location.pathname.startsWith("/load") && !location.search.includes("launcher=true")) {
    console.log("[PHEx] Not on load page, skipping document rewrite")
    return
  }

  const extensionGameUrl = window.__PHEX_GAME_URL__
  if (!extensionGameUrl) {
    console.warn("[PHEx] No extension game URL available, cannot rewrite")
    return
  }

  try {
    const xhr = new XMLHttpRequest()
    xhr.open("GET", location.href, false)
    xhr.send()

    if (xhr.status === 200 && xhr.responseText) {
      let html = xhr.responseText

      // 1. Strip ALL integrity attributes
      html = html.replace(/\s+integrity\s*=\s*"[^"]*"/gi, "")
      html = html.replace(/\s+integrity\s*=\s*'[^']*'/gi, "")

      // 2. REPLACE game.min.js URL with direct extension URL in <script> tags
      // This avoids the broken DNR extensionPath redirect entirely
      html = html.replace(
        /https?:\/\/code\.prodigygame\.com\/code\/[^"']*game\.min\.js[^"']*/gi,
        extensionGameUrl
      )

      // 3. Remove <link rel="preload"> for game.min.js (prevents ERR_BLOCKED_BY_CLIENT noise)
      html = html.replace(
        /<link[^>]*rel=["']preload["'][^>]*game\.min\.js[^>]*>/gi,
        "<!-- PHEx: preload removed -->"
      )
      // Also catch reverse attribute order
      html = html.replace(
        /<link[^>]*game\.min\.js[^>]*rel=["']preload["'][^>]*>/gi,
        "<!-- PHEx: preload removed -->"
      )

      // 4. Strip onload from the game.min.js <script> tag to prevent double init
      // P-NP suffix already calls SW.Load.onGameLoad(), the HTML onload would call it again
      // causing "Ambiguous match found for serviceIdentifier: MathTower"
      // We use a targeted regex to find the game script tag and remove its onload
      html = html.replace(
        /(<script[^>]*(?:game\.min\.js|assets\/game\.min)[^>]*?)(\s+onload\s*=\s*"[^"]*")([^>]*>)/gi,
        "$1$3"
      )
      html = html.replace(
        /(<script[^>]*(?:game\.min\.js|assets\/game\.min)[^>]*?)(\s+onload\s*=\s*'[^']*')([^>]*>)/gi,
        "$1$3"
      )

      console.log("[PHEx] Rewriting document: integrity stripped + game.min.js URL replaced + onload stripped")

      document.open()
      document.write(html)
      document.close()

      console.log("[PHEx] Document rewrite complete")
      return
    }
  } catch (e) {
    console.warn("[PHEx] Document rewrite failed:", e)
  }
})()

// ─── Phase 2: Prototype Overrides (belt-and-suspenders for dynamic scripts) ───

function lockIntegrity(el: HTMLElement): void {
  Object.defineProperty(el, "integrity", {
    set() {},
    get() { return "" },
    configurable: true,
  })
}

Document.prototype.createElement = function (tagName: string, options?: ElementCreationOptions): HTMLElement {
  const el = origCreateElement.call(this, tagName, options) as HTMLElement
  const tag = tagName.toLowerCase()
  if (tag === "script" || tag === "link") {
    lockIntegrity(el)
  }
  return el
}

Element.prototype.setAttribute = function (name: string, value: string) {
  if (name === "integrity") return
  return origSetAttribute.call(this, name, value)
}

for (const Proto of [HTMLScriptElement.prototype, HTMLLinkElement.prototype]) {
  Object.defineProperty(Proto, "integrity", {
    set() {},
    get() { return "" },
    configurable: true,
  })
}

// ─── Phase 3: appendChild override — replace game.min.js with extension URL ───

function isGameScript(node: Node): node is HTMLScriptElement {
  if (!(node instanceof HTMLScriptElement)) return false
  const src = node.src || ""
  return src.includes("game.min.js") && !origGetAttribute.call(node, "data-phex")
}

function createCleanGameScript(original: HTMLScriptElement): HTMLScriptElement {
  const extensionUrl = window.__PHEX_GAME_URL__
  const clean = origCreateElement.call(document, "script") as HTMLScriptElement
  lockIntegrity(clean)
  origSetAttribute.call(clean, "data-phex", "1")

  // Use the extension URL directly instead of relying on DNR redirect
  clean.src = extensionUrl || original.src

  // Copy event handlers for semaphore
  if (original.onload) clean.onload = original.onload
  if (original.onerror) clean.onerror = original.onerror
  if (original.async) clean.async = original.async
  if (original.defer) clean.defer = original.defer
  if (original.type) clean.type = original.type
  if (original.crossOrigin) clean.crossOrigin = original.crossOrigin

  console.log(`[PHEx] Replaced game.min.js with extension URL: ${clean.src}`)
  return clean
}

function stripIntegrity(node: Node): void {
  if (node instanceof HTMLScriptElement || node instanceof HTMLLinkElement) {
    const hasIntegrity = origGetAttribute.call(node, "integrity")
    if (hasIntegrity) {
      origRemoveAttribute.call(node, "integrity")
    }
  }
}

Node.prototype.appendChild = function <T extends Node>(child: T): T {
  if (isGameScript(child)) {
    const clean = createCleanGameScript(child as HTMLScriptElement)
    return origAppendChild.call(this, clean) as unknown as T
  }
  stripIntegrity(child)
  return origAppendChild.call(this, child) as T
}

Node.prototype.insertBefore = function <T extends Node>(newNode: T, refNode: Node | null): T {
  if (isGameScript(newNode)) {
    const clean = createCleanGameScript(newNode as HTMLScriptElement)
    return origInsertBefore.call(this, clean, refNode) as unknown as T
  }
  stripIntegrity(newNode)
  return origInsertBefore.call(this, newNode, refNode) as T
}

Element.prototype.append = function (...nodes: (Node | string)[]) {
  const processed = nodes.map(node => {
    if (node instanceof Node) {
      if (isGameScript(node)) {
        return createCleanGameScript(node as HTMLScriptElement)
      }
      stripIntegrity(node)
    }
    return node
  })
  return origAppend.apply(this, processed)
}

// ─── Phase 4: MutationObserver fallback ───
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLScriptElement || node instanceof HTMLLinkElement) {
        const hasIntegrity = origGetAttribute.call(node, "integrity")
        if (hasIntegrity) {
          origRemoveAttribute.call(node, "integrity")
        }
      }
    }
  }
})

// ─── Init ───
;(function main() {
  if (window.__PHEX_INJECTED__) return
  window.__PHEX_INJECTED__ = true

  const root = document.documentElement || document
  observer.observe(root, { childList: true, subtree: true })

  if (!document.documentElement) {
    const earlyObserver = new MutationObserver(() => {
      if (document.documentElement) {
        earlyObserver.disconnect()
        observer.observe(document.documentElement, { childList: true, subtree: true })
      }
    })
    earlyObserver.observe(document, { childList: true })
  }

  console.log("[PHEx] Content script loaded — document rewrite + direct URL replacement active")
})()
