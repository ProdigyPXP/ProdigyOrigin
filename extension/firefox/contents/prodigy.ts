import type { PlasmoCSConfig } from "plasmo"
import { isGameScriptSrc } from "../lib/patch-urls"
import { buildInlineInjector } from "../lib/inline-injector"

export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_start",
  world: "MAIN"
}

declare global {
  interface Window {
    __ORIGIN_INJECTED__?: boolean
    __ORIGIN_REWRITTEN__?: boolean
    __ORIGIN_MANIFEST_URL__?: string
  }
}

// ─── Save originals ───
const origAppendChild = Node.prototype.appendChild
const origInsertBefore = Node.prototype.insertBefore
const origAppend = Element.prototype.append
const origRemoveAttribute = Element.prototype.removeAttribute
const origSetAttribute = Element.prototype.setAttribute
const origGetAttribute = Element.prototype.getAttribute
const origCreateElement = Document.prototype.createElement

// ─── Prototype overrides (integrity bypass) ───
function lockIntegrity(el: HTMLElement): void {
  Object.defineProperty(el, "integrity", {
    set() {}, get() { return "" }, configurable: true,
  })
}

Document.prototype.createElement = function (tagName: string, options?: ElementCreationOptions): HTMLElement {
  const el = origCreateElement.call(this, tagName, options) as HTMLElement
  const tag = tagName.toLowerCase()
  if (tag === "script" || tag === "link") lockIntegrity(el)
  return el
}

Element.prototype.setAttribute = function (name: string, value: string) {
  if (name === "integrity") return
  return origSetAttribute.call(this, name, value)
}

for (const Proto of [HTMLScriptElement.prototype, HTMLLinkElement.prototype]) {
  Object.defineProperty(Proto, "integrity", {
    set() {}, get() { return "" }, configurable: true,
  })
}

// ─── appendChild override (intercept the script tag so the original never runs) ───

function isGameScript(node: Node): node is HTMLScriptElement {
  if (!(node instanceof HTMLScriptElement)) return false
  if (origGetAttribute.call(node, "data-origin") === "1") return false
  return isGameScriptSrc(node.src || origGetAttribute.call(node, "src") || "")
}

function createNopScript(): HTMLScriptElement {
  const nop = origCreateElement.call(document, "script") as HTMLScriptElement
  lockIntegrity(nop)
  origSetAttribute.call(nop, "data-origin", "1")
  return nop
}

let gameScriptHandled = false

function injectGameClientSide(originalGameUrl: string): void {
  if (gameScriptHandled) return
  gameScriptHandled = true

  const manifestUrl = window.__ORIGIN_MANIFEST_URL__
  if (!manifestUrl) {
    console.error("[Origin] no manifest URL available")
    return
  }

  console.log(`[Origin] Firefox inline-injecting (manifest=${manifestUrl}, game=${originalGameUrl})`)
  const inlineJs = buildInlineInjector(manifestUrl, originalGameUrl)
  // Execute via onreset (synchronous, MAIN world). Same trick used everywhere.
  document.documentElement.setAttribute("onreset", inlineJs)
  document.documentElement.dispatchEvent(new CustomEvent("reset"))
  document.documentElement.removeAttribute("onreset")
}

function stripIntegrity(node: Node): void {
  if (node instanceof HTMLScriptElement || node instanceof HTMLLinkElement) {
    if (origGetAttribute.call(node, "integrity")) {
      origRemoveAttribute.call(node, "integrity")
    }
  }
}

Node.prototype.appendChild = function <T extends Node>(child: T): T {
  if (isGameScript(child)) {
    const gameUrl = (child as HTMLScriptElement).src
    injectGameClientSide(gameUrl)
    return origAppendChild.call(this, createNopScript()) as unknown as T
  }
  stripIntegrity(child)
  return origAppendChild.call(this, child) as T
}

Node.prototype.insertBefore = function <T extends Node>(newNode: T, refNode: Node | null): T {
  if (isGameScript(newNode)) {
    const gameUrl = (newNode as HTMLScriptElement).src
    injectGameClientSide(gameUrl)
    return origInsertBefore.call(this, createNopScript(), refNode) as unknown as T
  }
  stripIntegrity(newNode)
  return origInsertBefore.call(this, newNode, refNode) as T
}

Element.prototype.append = function (...nodes: (Node | string)[]) {
  const processed = nodes.map((node) => {
    if (node instanceof Node && isGameScript(node)) {
      const gameUrl = (node as HTMLScriptElement).src
      injectGameClientSide(gameUrl)
      return createNopScript()
    }
    if (node instanceof Node) stripIntegrity(node)
    return node
  })
  return origAppend.apply(this, processed)
}

// ─── MutationObserver (strip integrity) ───
const integrityObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLScriptElement || node instanceof HTMLLinkElement) {
        if (origGetAttribute.call(node, "integrity")) {
          origRemoveAttribute.call(node, "integrity")
        }
      }
    }
  }
})

// ─── Document rewrite (load page only) ───

function readManifestUrlFromBridge(): void {
  const url = document.documentElement?.getAttribute("data-origin-manifest-url")
  if (url) {
    window.__ORIGIN_MANIFEST_URL__ = url
    console.log("[Origin] manifest URL:", url)
  }
}

function rewriteDocument(): void {
  if (window.__ORIGIN_REWRITTEN__) return
  window.__ORIGIN_REWRITTEN__ = true

  if (!location.pathname.startsWith("/load") && !location.search.includes("launcher=true")) {
    console.log("[Origin] Not on load page, skipping document rewrite")
    return
  }

  const manifestUrl = window.__ORIGIN_MANIFEST_URL__
  if (!manifestUrl) {
    console.warn("[Origin] No manifest URL available, cannot rewrite")
    return
  }

  try {
    // Strip auth code/state params — they're one-time tokens.
    const rewriteUrl = new URL(location.href)
    rewriteUrl.searchParams.delete("code")
    rewriteUrl.searchParams.delete("state")
    const xhr = new XMLHttpRequest()
    xhr.open("GET", rewriteUrl.href, false)
    xhr.send()

    if (xhr.status === 200 && xhr.responseText) {
      let html = xhr.responseText

      html = html.replace(/\s+integrity\s*=\s*"[^"]*"/gi, "")
      html = html.replace(/\s+integrity\s*=\s*'[^']*'/gi, "")
      html = html.replace(
        /<link[^>]*rel=["']preload["'][^>]*game\.min\.js[^>]*>/gi,
        "<!-- Origin: preload removed -->"
      )
      html = html.replace(
        /<link[^>]*game\.min\.js[^>]*rel=["']preload["'][^>]*>/gi,
        "<!-- Origin: preload removed -->"
      )

      // Find the original game.min.js URL from the script tag.
      const scriptTagRe =
        /<script[^>]*src=["']([^"']*code\.prodigygame\.com\/code\/[^/]+\/game\.min\.js[^"']*)["'][^>]*>\s*(<\/script>)?/i
      const m = html.match(scriptTagRe)
      const originalGameUrl = m?.[1]
      if (!originalGameUrl) {
        console.warn("[Origin] could not locate game.min.js script tag in document HTML; aborting rewrite")
        return
      }

      const inlineJs = buildInlineInjector(manifestUrl, originalGameUrl)
      const inlineInjector = `<script>${inlineJs}<\/script>`

      html = html.replace(scriptTagRe, inlineInjector)

      console.log("[Origin] Rewriting document: integrity stripped + game script replaced with client-side injector")

      document.open()
      document.write(html)
      document.close()

      console.log("[Origin] Document rewrite complete")
    }
  } catch (e) {
    console.warn("[Origin] Document rewrite failed:", e)
  }
}

// ─── Init ───
;(function main() {
  if (window.__ORIGIN_INJECTED__) return
  window.__ORIGIN_INJECTED__ = true

  const root = document.documentElement || document
  integrityObserver.observe(root, { childList: true, subtree: true })

  if (!document.documentElement) {
    const earlyObserver = new MutationObserver(() => {
      if (document.documentElement) {
        earlyObserver.disconnect()
        integrityObserver.observe(document.documentElement, { childList: true, subtree: true })
      }
    })
    earlyObserver.observe(document, { childList: true })
  }

  if (document.documentElement?.getAttribute("data-origin-ready")) {
    readManifestUrlFromBridge()
    rewriteDocument()
    return
  }

  const bridgeObserver = new MutationObserver(() => {
    if (document.documentElement?.getAttribute("data-origin-ready")) {
      bridgeObserver.disconnect()
      readManifestUrlFromBridge()
      rewriteDocument()
    }
  })
  bridgeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-origin-ready"]
  })

  console.log("[Origin] Firefox content script loaded — waiting for bridge ready signal")
})()
