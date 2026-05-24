/**
 * Returns the JS string embedded inside the document-rewrite payload.
 * This script runs in MAIN world AFTER document.write — it has no access to
 * chrome.* APIs, so it fetches the manifest and original bundle directly,
 * applies patches client-side, and injects via onreset.
 *
 * Both URLs are interpolated as JSON-quoted string literals to safely embed
 * any characters in the URL.
 */
export const buildInlineInjector = (
  manifestUrl: string,
  originalGameUrl: string
): string => {
  const m = JSON.stringify(manifestUrl)
  const g = JSON.stringify(originalGameUrl)
  const semaphore =
    `if(window.SW&&window.SW.Load&&typeof window.SW.Load.decrementLoadSemaphore==='function')window.SW.Load.decrementLoadSemaphore();`
  return `(async()=>{
    try {
      const [manifestRes, gameRes] = await Promise.all([
        fetch(${m}),
        fetch(${g})
      ]);
      if (!manifestRes.ok) throw new Error("manifest HTTP " + manifestRes.status);
      if (!gameRes.ok) throw new Error("game HTTP " + gameRes.status);
      const manifest = await manifestRes.json();
      let source = await gameRes.text();
      if (!manifest || !Array.isArray(manifest.rules) || typeof manifest.prefix !== 'string' || typeof manifest.suffix !== 'string') {
        throw new Error("manifest malformed");
      }
      for (const rule of manifest.rules) {
        const re = new RegExp(rule.find, rule.flags);
        source = source.replace(re, rule.replace);
      }
      const wrapped = manifest.prefix + "\\n" + source + "\\n" + manifest.suffix;
      const payload = "var URL=window.URL;\\n" + wrapped + "\\n${semaphore}";
      document.documentElement.setAttribute("onreset", payload);
      document.documentElement.dispatchEvent(new CustomEvent("reset"));
      document.documentElement.removeAttribute("onreset");
      console.log("[Origin] patched bundle injected via onreset (Firefox inline)");
    } catch (e) {
      console.error("[Origin] inline injector failed:", e);
    }
  })();`
}
