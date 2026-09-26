// extension/lib/runtime/ready.ts
// Tells the packaged menu the game is ready to be modded.

export const READY_EVENT = "origin:ready"
const READY_FLAG = "__ORIGIN_READY__"

export const markOriginReady = (win: any): void => {
  if (win[READY_FLAG]) return
  win[READY_FLAG] = true
  win.dispatchEvent(new Event(READY_EVENT))
}

export const whenOriginReady = (win: any): Promise<void> =>
  win[READY_FLAG]
    ? Promise.resolve()
    : new Promise((resolve) => win.addEventListener(READY_EVENT, () => resolve(), { once: true }))
