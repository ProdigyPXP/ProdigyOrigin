import type { PlasmoCSConfig } from "plasmo"

/**
 * Play Origin Bridge — ISOLATED-world content script.
 *
 * The MAIN-world script (contents/prodigy.ts) cannot call chrome.* APIs.
 * It dispatches `__origin_patch_request__` on `document` with the captured
 * game URL; this bridge forwards the request to the background service worker
 * via chrome.runtime.sendMessage, then dispatches `__origin_patch_response__`
 * back with the result.
 *
 * Default world is ISOLATED — leaving the `world:` field unset avoids the
 * Parcel transformer rejecting it.
 */
export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_start"
}

type RequestDetail = { originalUrl: string }
type ResponseDetail =
  | { ok: true; patchedBundle: string }
  | { ok: false; error: string }

document.addEventListener("__origin_patch_request__", (e: Event) => {
  const detail = (e as CustomEvent<RequestDetail>).detail
  if (!detail || typeof detail.originalUrl !== "string") return

  chrome.runtime
    .sendMessage({ type: "GET_PATCHED_BUNDLE", originalUrl: detail.originalUrl })
    .then((response: ResponseDetail) => {
      document.dispatchEvent(
        new CustomEvent<ResponseDetail>("__origin_patch_response__", { detail: response })
      )
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      document.dispatchEvent(
        new CustomEvent<ResponseDetail>("__origin_patch_response__", {
          detail: { ok: false, error: `bridge: ${message}` }
        })
      )
    })
})

console.log("[Origin] bridge active")
