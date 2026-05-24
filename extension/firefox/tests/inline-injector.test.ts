import test from "node:test";
import assert from "node:assert/strict";
import { buildInlineInjector } from "../lib/inline-injector.ts";

test("buildInlineInjector returns a string containing both URLs", () => {
  const js = buildInlineInjector(
    "https://example.com/manifest.json",
    "https://code.prodigygame.com/code/2026.25.0/game.min.js?v=2026.25.0",
    ""
  );
  assert.ok(js.includes("https://example.com/manifest.json"));
  assert.ok(js.includes("https://code.prodigygame.com/code/2026.25.0/game.min.js"));
});

test("buildInlineInjector embeds override URL as JSON string literal", () => {
  const js = buildInlineInjector(
    "https://example.com/manifest.json",
    "https://code.prodigygame.com/code/x/game.min.js",
    "https://custom.example/m.js"
  );
  assert.ok(js.includes(`"https://custom.example/m.js"`));
});

test("buildInlineInjector with empty override embeds empty string literal", () => {
  const js = buildInlineInjector(
    "https://example.com/manifest.json",
    "https://code.prodigygame.com/code/x/game.min.js",
    ""
  );
  // empty override means: fall back to manifest.defaultMenuUrl at runtime
  assert.ok(js.includes(`""`));
  assert.ok(js.includes("manifest.defaultMenuUrl"));
});

test("buildInlineInjector prepends __ORIGIN_MENU_URL__ global to payload", () => {
  const js = buildInlineInjector("a", "b", "");
  assert.ok(js.includes("__ORIGIN_MENU_URL__"));
});

// Legacy tests — kept, calls updated to include third arg
test("buildInlineInjector returns a non-empty string", () => {
  const s = buildInlineInjector("https://example.com/manifest.json", "https://code.prodigygame.com/code/X/game.min.js", "")
  assert.equal(typeof s, "string")
  assert.ok(s.length > 100)
});

test("buildInlineInjector embeds the manifest URL", () => {
  const url = "https://raw.githubusercontent.com/foo/bar/v4.4.0-client/dist/manifest.json"
  const s = buildInlineInjector(url, "https://x/y.js", "")
  assert.ok(s.includes(url))
});

test("buildInlineInjector embeds the original game URL", () => {
  const url = "https://code.prodigygame.com/code/2026.18.1/game.min.js?v=2026.18.1"
  const s = buildInlineInjector("https://m", url, "")
  assert.ok(s.includes(url))
});

test("buildInlineInjector contains the regex-apply loop", () => {
  const s = buildInlineInjector("https://m", "https://g", "")
  assert.ok(s.includes("new RegExp"))
  assert.ok(s.includes("manifest.rules"))
});

test("buildInlineInjector injects via onreset and dispatches reset", () => {
  const s = buildInlineInjector("https://m", "https://g", "")
  assert.ok(s.includes("onreset"))
  assert.ok(s.includes('CustomEvent("reset")'))
});

test("buildInlineInjector calls decrementLoadSemaphore as fallback", () => {
  const s = buildInlineInjector("https://m", "https://g", "")
  assert.ok(s.includes("decrementLoadSemaphore"))
});

test("buildInlineInjector returns valid JS (wraps cleanly in script tags without unescaped </script>)", () => {
  const s = buildInlineInjector("https://m", "https://g", "")
  assert.ok(!s.includes("</script"))
});
