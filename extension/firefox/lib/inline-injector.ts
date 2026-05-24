/**
 * Returns the JS string embedded inside the document-rewrite payload.
 * Runs in MAIN world AFTER document.write — no chrome.* APIs, so it fetches
 * manifest + original bundle directly, applies patches, prepends the
 * resolved __ORIGIN_MENU_URL__ global, and injects via onreset.
 *
 * Resolved menu URL = guiUrlOverride (if non-empty) || manifest.defaultMenuUrl.
 *
 * All three URL inputs are JSON-stringified before embedding so any chars in
 * the URL are safe.
 */
export const buildInlineInjector = (
  manifestUrl: string,
  originalGameUrl: string,
  guiUrlOverride: string
): string => {
  const m = JSON.stringify(manifestUrl)
  const g = JSON.stringify(originalGameUrl)
  const o = JSON.stringify(guiUrlOverride)
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
      const override = ${o};
      const resolvedMenuUrl =
        (typeof override === "string" && override.length > 0)
          ? override
          : (typeof manifest.defaultMenuUrl === "string" ? manifest.defaultMenuUrl : "");
      const wrapped = manifest.prefix + "\\n" + source + "\\n" + manifest.suffix;
      const menuGlobal =
        "globalThis.__ORIGIN_MENU_URL__=" + JSON.stringify(resolvedMenuUrl) + ";\\n";
      const payload = "var URL=window.URL;\\n" + menuGlobal + wrapped + "\\n${semaphore}";
      document.documentElement.setAttribute("onreset", payload);
      document.documentElement.dispatchEvent(new CustomEvent("reset"));
      document.documentElement.removeAttribute("onreset");
      console.log("[Origin] patched bundle injected via onreset (Firefox inline)");
    } catch (e) {
      console.error("[Origin] inline injector failed:", e);
    }
  })();`
}
