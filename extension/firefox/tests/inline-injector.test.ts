import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildInlineInjector } from "../lib/inline-injector.ts"

describe("buildInlineInjector", () => {
  it("returns a non-empty string", () => {
    const s = buildInlineInjector("https://example.com/manifest.json", "https://code.prodigygame.com/code/X/game.min.js")
    assert.equal(typeof s, "string")
    assert.ok(s.length > 100)
  })

  it("embeds the manifest URL", () => {
    const url = "https://raw.githubusercontent.com/foo/bar/v4.4.0-client/dist/manifest.json"
    const s = buildInlineInjector(url, "https://x/y.js")
    assert.ok(s.includes(url))
  })

  it("embeds the original game URL", () => {
    const url = "https://code.prodigygame.com/code/2026.18.1/game.min.js?v=2026.18.1"
    const s = buildInlineInjector("https://m", url)
    assert.ok(s.includes(url))
  })

  it("contains the regex-apply loop", () => {
    const s = buildInlineInjector("https://m", "https://g")
    assert.ok(s.includes("new RegExp"))
    assert.ok(s.includes("manifest.rules"))
  })

  it("injects via onreset and dispatches reset", () => {
    const s = buildInlineInjector("https://m", "https://g")
    assert.ok(s.includes("onreset"))
    assert.ok(s.includes('CustomEvent("reset")'))
  })

  it("calls decrementLoadSemaphore as fallback", () => {
    const s = buildInlineInjector("https://m", "https://g")
    assert.ok(s.includes("decrementLoadSemaphore"))
  })

  it("returns valid JS (wraps cleanly in script tags without unescaped </script>)", () => {
    const s = buildInlineInjector("https://m", "https://g")
    assert.ok(!s.includes("</script"))
  })
})
