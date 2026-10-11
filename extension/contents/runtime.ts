import type { PlasmoCSConfig } from "plasmo"
import { createOriginApi } from "../lib/runtime/api"
import {
  installAnswerQuestionActionBypass,
  installOpenQuestionBypass,
  installTowerTownBypass
} from "../lib/runtime/bypasses"
import { installModuleHook } from "../lib/runtime/modules"
import { markOriginReady } from "../lib/runtime/ready"
import { missingTargets, resolveTargets, type Targets } from "../lib/runtime/resolve"
import { VERSION } from "../lib/version"

export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_start",
  world: "MAIN"
}

// Must run before game.min.js so every webpack export object is seen.
const exportsObjects = new Set<object>()
installModuleHook(Object, exportsObjects)

const TICK_MS = 500
const GIVE_UP_MS = 120_000
const startedAt = Date.now()

let targets: Targets = {}
let api: ReturnType<typeof createOriginApi> | undefined
let reportedMissing = false
const installed = new Set<string>()
const getConstants = () => targets.constants

const install = (name: string, run: () => boolean) => {
  if (installed.has(name)) return
  if (run()) {
    installed.add(name)
    console.log(`[Origin] hook installed: ${name}`)
  }
}

const tick = () => {
  const searching = missingTargets(targets).length > 0 && Date.now() - startedAt < GIVE_UP_MS
  if (searching) targets = resolveTargets(exportsObjects, targets)

  const { componentRegistry, baseActionClass, towerTownClass, singletonClass, constants } = targets
  if (componentRegistry?.OpenQuestionInterface) {
    install("OpenQuestionInterface.answerQuestion", () =>
      installOpenQuestionBypass(componentRegistry.OpenQuestionInterface, getConstants))
  }
  if (baseActionClass) install("AnswerQuestion action", () => installAnswerQuestionActionBypass(baseActionClass, getConstants))
  if (towerTownClass) install("Tower Town questions", () => installTowerTownBypass(towerTownClass, getConstants))

  if (singletonClass && constants) {
    api ??= createOriginApi({ singletonClass, constants })
    api.ensure(window)
    if (api.isReady(window)) markOriginReady(window)
  }

  if (!searching && !reportedMissing) {
    const missing = missingTargets(targets)
    if (missing.length > 0) {
      reportedMissing = true
      console.warn(`[Origin] hook target missing: ${missing.join(", ")}`)
    }
  }
}

setInterval(() => {
  try {
    tick()
  } catch (e) {
    console.error("[Origin] runtime tick failed:", e)
  }
}, TICK_MS)

console.log(`[Origin] packaged runtime active v${VERSION}`)
