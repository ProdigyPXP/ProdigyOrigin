// extension/tests/runtime-resolve.test.ts
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { missingTargets, resolveTargets, TARGET_NAMES } from "../lib/runtime/resolve.ts"

const exportsOf = (values: Record<string, unknown>): object => {
  const e = {}
  for (const k of Object.keys(values)) Object.defineProperty(e, k, { enumerable: true, get: () => values[k] })
  return e
}

// Shapes copied from game.min.js (module ids as of 2026.18.1 in comments).
class Singleton { // 35120 q
  static _instance: unknown = null
  static get instance() { return this._instance }
  get game() { return null }
  get prodigy() { return null }
}
class GameOnlySingleton { // 61806 W: decoy, has instance+game but no prodigy
  static get instance() { return null }
  get game() { return null }
}
class ConstantsHolder { // 34829 s
  static constants = { "GameConstants.Build.VERSION": "2026.18.1", "GameConstants.Debug.EDUCATION_ENABLED": true }
}
class OpenQuestionInterface { answerQuestion() {} }
const componentRegistry = { OpenQuestionInterface } // 40794 X
class BaseAction { // 62459 rcl
  init() {} execute() {} finish() {} findParameter() {} validateParameters() {}
}
class AnswerQuestionAction extends BaseAction { execute() {} } // decoy: owns execute only
class TowerTown { openQuestionInterfaceThenEmitNotifications() {} } // 82142 gT

const allExports = () => [
  exportsOf({ W: GameOnlySingleton }),
  exportsOf({ q: Singleton }),
  exportsOf({ A: {}, s: ConstantsHolder }),
  exportsOf({ X: componentRegistry, u: class {} }),
  exportsOf({ rcl: BaseAction, sub: AnswerQuestionAction }),
  exportsOf({ gT: TowerTown })
]

describe("resolveTargets", () => {
  it("finds every target by shape", () => {
    const t = resolveTargets(allExports(), {})
    assert.equal(t.singletonClass, Singleton)
    assert.equal(t.constants, ConstantsHolder.constants)
    assert.equal(t.componentRegistry, componentRegistry)
    assert.equal(t.baseActionClass, BaseAction)
    assert.equal(t.towerTownClass, TowerTown)
    assert.deepEqual(missingTargets(t), [])
  })

  it("skips getters that throw", () => {
    const tdz = {}
    Object.defineProperty(tdz, "S", { enumerable: true, get() { throw new ReferenceError("Cannot access 'S' before initialization") } })
    const t = resolveTargets([tdz, ...allExports()], {})
    assert.equal(t.singletonClass, Singleton)
  })

  it("resolves the targets that exist and reports the rest", () => {
    const t = resolveTargets([exportsOf({ q: Singleton })], {})
    assert.equal(t.singletonClass, Singleton)
    assert.deepEqual(missingTargets(t), TARGET_NAMES.filter((n) => n !== "singletonClass"))
  })

  it("keeps already-found targets and fills the rest later", () => {
    const first = resolveTargets([exportsOf({ q: Singleton })], {})
    const second = resolveTargets(allExports(), first)
    assert.equal(second.singletonClass, Singleton)
    assert.equal(second.towerTownClass, TowerTown)
  })

  it("does not treat a registry that lacks OpenQuestionInterface yet as found", () => {
    const t = resolveTargets([exportsOf({ X: {} })], {})
    assert.equal(t.componentRegistry, undefined)
  })
})
