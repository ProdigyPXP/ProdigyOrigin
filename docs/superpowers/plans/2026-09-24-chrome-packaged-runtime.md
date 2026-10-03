# Chrome Packaged Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Chrome extension's fetch-patch-`onreset` pipeline with packaged MAIN-world hooks and a packaged menu, so no JavaScript runs unless it was in the extension zip.

**Architecture:** A `document_start` MAIN-world content script wraps `Object.defineProperty` to collect webpack export objects while Prodigy's unmodified `game.min.js` loads. After boot it resolves five targets by shape or name (singleton class, constants object, component registry, base action class, Tower Town class). It then wraps three prototype methods for the education bypasses and builds the `window._` API the menu reads. A second MAIN-world content script packages originGUI and starts it on `origin:ready`.

**Tech Stack:** TypeScript, Plasmo 0.90 (Parcel), node:test with `--experimental-strip-types`, esbuild (originGUI), pnpm.

**Spec:** `docs/superpowers/specs/2026-09-24-chrome-packaged-runtime-design.md`

## Global Constraints

- Branch `chrome/packaged-runtime` only. Never push or merge to master; master stays on the P-NP pipeline for Edge/Firefox.
- Only `extension/` (not `extension/firefox/`) and `originGUI/` change.
- No `eval`, `new Function`, `onreset`, or fetch-then-execute anywhere in code this branch ships.
- pnpm, never npm. No force pushes.
- Log prefix `[Origin]`.
- `lib/runtime/*.ts` modules import only *types* from each other (node's strip-types runner can't resolve extensionless value imports). Value wiring happens in `contents/*.ts`.
- Content script matches: `https://math.prodigygame.com/*`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Game code reads a webpack getter before its module finishes (TDZ `ReferenceError`)** → the scan skips that value and keeps going (Task 2 test `skips getters that throw`).
2. **Prodigy removes or renames one target** → the other hooks still install, and one `[Origin] hook target missing:` line is logged after the give-up window (Task 2 test `resolves the targets that exist and reports the rest`, Task 5 glue).
3. **The user flips education back on mid-session** → the original method runs again, with no stale bypass (Task 3 tests `runs the original when education is enabled`).
4. **Lodash replaces `window._` after the API is applied** → the API re-applies to the new object without clobbering lodash's own `functions`, and a membership snapshot taken before the swap survives it (Task 4 tests `re-applies after window._ is replaced` and `keeps the original membership snapshot across re-apply`).
5. **Content script evaluated twice, or bypass installer called on every tick** → each method is wrapped exactly once (Task 3 test `wraps once`).

---

### Task 1: Webpack export capture hook

**Files:**
- Create: `extension/lib/runtime/modules.ts`
- Test: `extension/tests/runtime-modules.test.ts`

**Interfaces:**
- Produces: `isWebpackExportDescriptor(key: PropertyKey, desc: unknown): boolean`, `installModuleHook(objectCtor: { defineProperty: ObjectConstructor["defineProperty"] }, sink: Set<object>): () => void` (returns uninstall).

- [ ] **Step 1: Write the failing test**

```ts
// extension/tests/runtime-modules.test.ts
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { installModuleHook, isWebpackExportDescriptor } from "../lib/runtime/modules.ts"

const makeCtor = () => ({ defineProperty: Object.defineProperty }) as { defineProperty: ObjectConstructor["defineProperty"] }

// Mirrors game.min.js: __webpack_require__.d=(E,w)=>{for(var T in w)o(w,T)&&!o(E,T)&&Object.defineProperty(E,T,{enumerable:!0,get:w[T]})}
const webpackD = (ctor: ReturnType<typeof makeCtor>) => (exports: object, definition: Record<string, () => unknown>) => {
  for (const key in definition) {
    if (Object.prototype.hasOwnProperty.call(definition, key) && !Object.prototype.hasOwnProperty.call(exports, key)) {
      ctor.defineProperty(exports, key, { enumerable: true, get: definition[key] })
    }
  }
}

describe("isWebpackExportDescriptor", () => {
  it("accepts webpack's {enumerable, get} export descriptor", () => {
    assert.equal(isWebpackExportDescriptor("q", { enumerable: true, get: () => 1 }), true)
  })
  it("accepts the Module toStringTag", () => {
    assert.equal(isWebpackExportDescriptor(Symbol.toStringTag, { value: "Module" }), true)
  })
  it("rejects other descriptors", () => {
    assert.equal(isWebpackExportDescriptor("q", { value: 1 }), false)
    assert.equal(isWebpackExportDescriptor("q", { enumerable: true, configurable: true, get: () => 1 }), false)
    assert.equal(isWebpackExportDescriptor("q", undefined), false)
  })
})

describe("installModuleHook", () => {
  it("captures export objects defined through the hooked defineProperty", () => {
    const ctor = makeCtor()
    const sink = new Set<object>()
    installModuleHook(ctor, sink)
    const exports = {}
    webpackD(ctor)(exports, { q: () => 42 })
    assert.ok(sink.has(exports))
    assert.equal((exports as { q: number }).q, 42)
  })
  it("passes non-export defines through without capturing", () => {
    const ctor = makeCtor()
    const sink = new Set<object>()
    installModuleHook(ctor, sink)
    const obj = {}
    ctor.defineProperty(obj, "x", { value: 1, writable: true })
    assert.equal(sink.size, 0)
    assert.equal((obj as { x: number }).x, 1)
  })
  it("uninstall restores the original", () => {
    const ctor = makeCtor()
    const uninstall = installModuleHook(ctor, new Set())
    assert.notEqual(ctor.defineProperty, Object.defineProperty)
    uninstall()
    assert.equal(ctor.defineProperty, Object.defineProperty)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd extension && node --experimental-strip-types --test tests/runtime-modules.test.ts`
Expected: FAIL, cannot find module `../lib/runtime/modules.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// extension/lib/runtime/modules.ts
// Captures webpack export objects as Prodigy's unmodified game.min.js creates
// them. webpack's __webpack_require__.d defines every export as
// Object.defineProperty(exports, key, { enumerable: true, get }), and
// __webpack_require__.r tags a few namespaces with Symbol.toStringTag "Module".
// Wrapping Object.defineProperty lets packaged code see those objects without
// rewriting the game's source.

type DefineProperty = ObjectConstructor["defineProperty"]

export const isWebpackExportDescriptor = (key: PropertyKey, desc: unknown): boolean => {
  if (!desc || typeof desc !== "object") return false
  const d = desc as PropertyDescriptor
  if (key === Symbol.toStringTag) return d.value === "Module"
  return d.enumerable === true && typeof d.get === "function" && Object.keys(d).length === 2
}

export const installModuleHook = (
  objectCtor: { defineProperty: DefineProperty },
  sink: Set<object>
): (() => void) => {
  const original = objectCtor.defineProperty
  const hooked = function defineProperty(target: object, key: PropertyKey, desc: PropertyDescriptor) {
    if (isWebpackExportDescriptor(key, desc)) sink.add(target)
    return original(target, key, desc)
  } as DefineProperty
  objectCtor.defineProperty = hooked
  return () => {
    if (objectCtor.defineProperty === hooked) objectCtor.defineProperty = original
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd extension && node --experimental-strip-types --test tests/runtime-modules.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add extension/lib/runtime/modules.ts extension/tests/runtime-modules.test.ts
git commit -m "feat(extension): capture webpack export objects via defineProperty hook"
```

---

### Task 2: Hook target resolvers

**Files:**
- Create: `extension/lib/runtime/resolve.ts`
- Test: `extension/tests/runtime-resolve.test.ts`

**Interfaces:**
- Consumes: nothing at runtime (operates on `Iterable<object>` from Task 1's sink).
- Produces:
  - `type AnyClass = Function & { prototype: any }`
  - `type Targets = { singletonClass?: AnyClass & { readonly instance?: any }; constants?: Record<string, unknown>; componentRegistry?: Record<string, AnyClass>; baseActionClass?: AnyClass; towerTownClass?: AnyClass }`
  - `type TargetName = keyof Targets`, `const TARGET_NAMES: readonly TargetName[]`
  - `resolveTargets(exportsObjects: Iterable<object>, found: Targets): Targets` (fills only missing targets; returns a new object)
  - `missingTargets(t: Targets): TargetName[]`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd extension && node --experimental-strip-types --test tests/runtime-resolve.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
// extension/lib/runtime/resolve.ts
// Finds the game objects Play Origin hooks, by shape or by names minification
// can't touch. Uses property descriptors only, so no game getters or methods run
// apart from webpack's own export getters.

export type AnyClass = Function & { prototype: any }

export type Targets = {
  singletonClass?: AnyClass & { readonly instance?: any }
  constants?: Record<string, unknown>
  componentRegistry?: Record<string, AnyClass>
  baseActionClass?: AnyClass
  towerTownClass?: AnyClass
}

export type TargetName = keyof Targets

export const TARGET_NAMES: readonly TargetName[] = [
  "singletonClass",
  "constants",
  "componentRegistry",
  "baseActionClass",
  "towerTownClass"
]

const BASE_ACTION_METHODS = ["init", "execute", "finish", "findParameter", "validateParameters"]

const descriptor = (obj: object, key: PropertyKey) => Object.getOwnPropertyDescriptor(obj, key)

const isClass = (v: unknown): v is AnyClass =>
  typeof v === "function" && typeof (v as AnyClass).prototype === "object" && (v as AnyClass).prototype !== null

const ownsMethod = (cls: AnyClass, name: string) => typeof descriptor(cls.prototype, name)?.value === "function"

// module 35120: class with static `instance` getter whose instances expose `prodigy`
const isSingletonClass = (v: unknown): v is NonNullable<Targets["singletonClass"]> =>
  isClass(v) && typeof descriptor(v, "instance")?.get === "function" && typeof descriptor(v.prototype, "prodigy")?.get === "function"

// module 34829: `X.constants = {"GameConstants.Build.VERSION": ...}`
const constantsOf = (v: unknown): Record<string, unknown> | undefined => {
  if (!v || (typeof v !== "object" && typeof v !== "function")) return undefined
  const c = descriptor(v, "constants")?.value
  return c && typeof c === "object" && Object.prototype.hasOwnProperty.call(c, "GameConstants.Build.VERSION") ? c : undefined
}

// module 40794 export X, filled by the EV("OpenQuestionInterface", …) decorator
const isComponentRegistry = (v: unknown): v is Record<string, AnyClass> =>
  !!v && typeof v === "object" && isClass(descriptor(v, "OpenQuestionInterface")?.value)

// module 62459 export rcl: subclasses only own `validate`/`execute`
const isBaseActionClass = (v: unknown): v is AnyClass => isClass(v) && BASE_ACTION_METHODS.every((m) => ownsMethod(v, m))

// module 82142 export gT (Tower Town)
const isTowerTownClass = (v: unknown): v is AnyClass => isClass(v) && ownsMethod(v, "openQuestionInterfaceThenEmitNotifications")

function* exportValues(exportsObjects: Iterable<object>): Generator<unknown> {
  for (const obj of exportsObjects) {
    let keys: string[]
    try {
      keys = Object.keys(obj)
    } catch {
      continue
    }
    for (const key of keys) {
      let value: unknown
      try {
        value = (obj as Record<string, unknown>)[key]
      } catch {
        continue // module still evaluating (TDZ)
      }
      yield value
    }
  }
}

export const missingTargets = (t: Targets): TargetName[] => TARGET_NAMES.filter((n) => !t[n])

export const resolveTargets = (exportsObjects: Iterable<object>, found: Targets): Targets => {
  const t: Targets = { ...found }
  if (missingTargets(t).length === 0) return t
  for (const v of exportValues(exportsObjects)) {
    if (!t.singletonClass && isSingletonClass(v)) t.singletonClass = v
    if (!t.constants) t.constants = constantsOf(v)
    if (!t.componentRegistry && isComponentRegistry(v)) t.componentRegistry = v
    if (!t.baseActionClass && isBaseActionClass(v)) t.baseActionClass = v
    if (!t.towerTownClass && isTowerTownClass(v)) t.towerTownClass = v
    if (missingTargets(t).length === 0) break
  }
  return t
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd extension && node --experimental-strip-types --test tests/runtime-resolve.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add extension/lib/runtime/resolve.ts extension/tests/runtime-resolve.test.ts
git commit -m "feat(extension): resolve hook targets from captured webpack exports"
```

---

### Task 3: Education bypass wraps

**Files:**
- Create: `extension/lib/runtime/bypasses.ts`
- Test: `extension/tests/runtime-bypasses.test.ts`

**Interfaces:**
- Consumes: `AnyClass` type from `resolve.ts` (type-only import).
- Produces:
  - `type GetConstants = () => Record<string, unknown> | undefined`
  - `installOpenQuestionBypass(cls: AnyClass, getConstants: GetConstants, random?: () => number): boolean`
  - `installAnswerQuestionActionBypass(baseActionClass: AnyClass, getConstants: GetConstants, random?: () => number): boolean`
  - `installTowerTownBypass(cls: AnyClass, getConstants: GetConstants): boolean`
  - All return `true` if the wrap is (or already was) installed, `false` if the method is missing.

Gate semantics (copied from the P-NP regex replacements): bypass active iff constants exist and `constants["GameConstants.Debug.EDUCATION_ENABLED"]` is falsy. Correct iff `random() < (constants["GameConstants.Debug.AUTO_ANSWER_CORRECT_PERCENT"] || 1)`.

- [ ] **Step 1: Write the failing test**

```ts
// extension/tests/runtime-bypasses.test.ts
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  installAnswerQuestionActionBypass,
  installOpenQuestionBypass,
  installTowerTownBypass
} from "../lib/runtime/bypasses.ts"

const EDU = "GameConstants.Debug.EDUCATION_ENABLED"
const PCT = "GameConstants.Debug.AUTO_ANSWER_CORRECT_PERCENT"

const signal = () => {
  const calls: unknown[][] = []
  return { calls, dispatch: (...args: unknown[]) => { calls.push(args) } }
}

const makeOpenQuestionClass = () =>
  class OpenQuestionInterface {
    onQuestionAnswered = signal()
    onQuestionAnsweredCorrectly = signal()
    onQuestionAnsweredIncorrectly = signal()
    opened = 0
    answerQuestion() { this.opened++ }
  }

describe("installOpenQuestionBypass", () => {
  it("runs the original when education is enabled", () => {
    const C = makeOpenQuestionClass()
    const constants: Record<string, unknown> = { [EDU]: true, [PCT]: 1 }
    installOpenQuestionBypass(C, () => constants)
    const q = new C()
    q.answerQuestion()
    assert.equal(q.opened, 1)
    assert.equal(q.onQuestionAnswered.calls.length, 0)
  })

  it("answers correctly without opening when education is disabled", () => {
    const C = makeOpenQuestionClass()
    installOpenQuestionBypass(C, () => ({ [EDU]: false, [PCT]: 1 }), () => 0)
    const q = new C()
    q.answerQuestion()
    assert.equal(q.opened, 0)
    assert.deepEqual(q.onQuestionAnswered.calls, [[true, 0, null]])
    assert.deepEqual(q.onQuestionAnsweredCorrectly.calls, [[0, null]])
    assert.equal(q.onQuestionAnsweredIncorrectly.calls.length, 0)
  })

  it("answers incorrectly when the roll misses the percentage", () => {
    const C = makeOpenQuestionClass()
    installOpenQuestionBypass(C, () => ({ [EDU]: false, [PCT]: 0.5 }), () => 0.9)
    const q = new C()
    q.answerQuestion()
    assert.deepEqual(q.onQuestionAnswered.calls, [[false, 0, null]])
    assert.deepEqual(q.onQuestionAnsweredIncorrectly.calls, [[0, null]])
  })

  it("follows the flag live: bypass off again once education is re-enabled", () => {
    const C = makeOpenQuestionClass()
    const constants: Record<string, unknown> = { [EDU]: false }
    installOpenQuestionBypass(C, () => constants, () => 0)
    const q = new C()
    q.answerQuestion()
    constants[EDU] = true
    q.answerQuestion()
    assert.equal(q.opened, 1)
  })

  it("runs the original while constants are unresolved", () => {
    const C = makeOpenQuestionClass()
    installOpenQuestionBypass(C, () => undefined)
    const q = new C()
    q.answerQuestion()
    assert.equal(q.opened, 1)
  })

  it("wraps once", () => {
    const C = makeOpenQuestionClass()
    installOpenQuestionBypass(C, () => undefined)
    const first = C.prototype.answerQuestion
    assert.equal(installOpenQuestionBypass(C, () => undefined), true)
    assert.equal(C.prototype.answerQuestion, first)
  })

  it("returns false when the method is missing", () => {
    assert.equal(installOpenQuestionBypass(class {}, () => undefined), false)
  })
})

describe("installAnswerQuestionActionBypass", () => {
  const make = () => {
    class BaseAction {
      data: any = null
      finished: unknown = undefined
      init(data: any) { this.data = data }
      execute() {}
      finish(result: unknown) { this.finished = result }
      findParameter() { return null }
      validateParameters() { return true }
    }
    class AnswerQuestion extends BaseAction { executed = false; execute() { this.executed = true } }
    class Other extends BaseAction { executed = false; execute() { this.executed = true } }
    return { BaseAction, AnswerQuestion, Other }
  }

  it("finishes AnswerQuestion actions without asking when education is disabled", () => {
    const { BaseAction, AnswerQuestion } = make()
    installAnswerQuestionActionBypass(BaseAction, () => ({ [EDU]: false }), () => 0)
    const a = new AnswerQuestion()
    a.init({ Type: "AnswerQuestion" })
    a.execute()
    assert.equal(a.executed, false)
    assert.deepEqual(a.finished, { answerCorrect: true, responseTime: 0 })
  })

  it("runs the original AnswerQuestion when education is enabled", () => {
    const { BaseAction, AnswerQuestion } = make()
    installAnswerQuestionActionBypass(BaseAction, () => ({ [EDU]: true }))
    const a = new AnswerQuestion()
    a.init({ Type: "AnswerQuestion" })
    a.execute()
    assert.equal(a.executed, true)
  })

  it("leaves other actions and the base execute alone", () => {
    const { BaseAction, Other } = make()
    const baseExecute = BaseAction.prototype.execute
    installAnswerQuestionActionBypass(BaseAction, () => ({ [EDU]: false }))
    const o = new Other()
    o.init({ Type: "Other" })
    o.execute()
    assert.equal(o.executed, true)
    assert.equal(BaseAction.prototype.execute, baseExecute)
  })
})

describe("installTowerTownBypass", () => {
  class TowerTown {
    opened = 0
    openQuestionInterfaceThenEmitNotifications(_e: unknown, _w: unknown, _t: unknown, _s: unknown, _cb?: Function) { this.opened++ }
  }

  it("calls the completion callback as a correct answer", () => {
    installTowerTownBypass(TowerTown, () => ({ [EDU]: false }))
    const t = new TowerTown()
    const calls: unknown[][] = []
    t.openQuestionInterfaceThenEmitNotifications(1, true, null, false, (...a: unknown[]) => calls.push(a))
    assert.equal(t.opened, 0)
    assert.deepEqual(calls, [[true, 10, 1, false, false, {}]])
  })

  it("tolerates a missing callback", () => {
    installTowerTownBypass(TowerTown, () => ({ [EDU]: false }))
    assert.doesNotThrow(() => new TowerTown().openQuestionInterfaceThenEmitNotifications(1, true, null, false))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd extension && node --experimental-strip-types --test tests/runtime-bypasses.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
// extension/lib/runtime/bypasses.ts
// Education bypasses, as prototype wraps. Replaces the P-NP regex rules
// answer-question-bypass, external-factory-bypass and open-question-bypass,
// which injected the same early returns into game.min.js source.

import type { AnyClass } from "./resolve"

export type GetConstants = () => Record<string, unknown> | undefined

const EDUCATION_ENABLED = "GameConstants.Debug.EDUCATION_ENABLED"
const CORRECT_PERCENT = "GameConstants.Debug.AUTO_ANSWER_CORRECT_PERCENT"
const WRAPPED = Symbol.for("playOrigin.wrapped")

type AnyFn = (...args: any[]) => any

const bypassed = (c: Record<string, unknown> | undefined): c is Record<string, unknown> => !!c && !c[EDUCATION_ENABLED]

const rollCorrect = (c: Record<string, unknown>, random: () => number) =>
  random() < ((c[CORRECT_PERCENT] as number) || 1)

// Wraps an *own* prototype method once. Returns false if there is none.
const wrapOwnMethod = (proto: any, name: string, make: (original: AnyFn) => AnyFn): boolean => {
  const original = Object.getOwnPropertyDescriptor(proto, name)?.value
  if (typeof original !== "function") return false
  if ((original as any)[WRAPPED]) return true
  const wrapped = make(original)
  ;(wrapped as any)[WRAPPED] = true
  proto[name] = wrapped
  return true
}

export const installOpenQuestionBypass = (
  cls: AnyClass,
  getConstants: GetConstants,
  random: () => number = Math.random
): boolean =>
  wrapOwnMethod(cls.prototype, "answerQuestion", (original) =>
    function (this: any, ...args: unknown[]) {
      const c = getConstants()
      if (!bypassed(c)) return original.apply(this, args)
      const correct = rollCorrect(c, random)
      this.onQuestionAnswered.dispatch(correct, 0, null)
      if (correct) this.onQuestionAnsweredCorrectly.dispatch(0, null)
      else this.onQuestionAnsweredIncorrectly.dispatch(0, null)
    }
  )

// The action registry is module-private, so catch AnswerQuestion when the
// action factory calls init(data) with data.Type === "AnswerQuestion".
export const installAnswerQuestionActionBypass = (
  baseActionClass: AnyClass,
  getConstants: GetConstants,
  random: () => number = Math.random
): boolean =>
  wrapOwnMethod(baseActionClass.prototype, "init", (originalInit) =>
    function (this: any, ...args: unknown[]) {
      const result = originalInit.apply(this, args)
      const data = args[0] as { Type?: unknown } | null | undefined
      const proto = Object.getPrototypeOf(this)
      if (data?.Type === "AnswerQuestion" && proto !== baseActionClass.prototype) {
        wrapOwnMethod(proto, "execute", (originalExecute) =>
          function (this: any, ...executeArgs: unknown[]) {
            const c = getConstants()
            if (!bypassed(c)) return originalExecute.apply(this, executeArgs)
            this.finish({ answerCorrect: rollCorrect(c, random), responseTime: 0 })
          }
        )
      }
      return result
    }
  )

export const installTowerTownBypass = (cls: AnyClass, getConstants: GetConstants): boolean =>
  wrapOwnMethod(cls.prototype, "openQuestionInterfaceThenEmitNotifications", (original) =>
    function (this: any, ...args: unknown[]) {
      if (!bypassed(getConstants())) return original.apply(this, args)
      const done = args[4]
      if (typeof done === "function") done(true, 10, 1, false, false, {})
    }
  )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd extension && node --experimental-strip-types --test tests/runtime-bypasses.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add extension/lib/runtime/bypasses.ts extension/tests/runtime-bypasses.test.ts
git commit -m "feat(extension): packaged education bypasses as prototype wraps"
```

---

### Task 4: `window._` API and ready signal

**Files:**
- Create: `extension/lib/runtime/api.ts`, `extension/lib/runtime/ready.ts`
- Test: `extension/tests/runtime-api.test.ts`

**Interfaces:**
- Consumes: `Targets` type from `resolve.ts` (type-only).
- Produces:
  - `api.ts`: `discoverService(gc: any, matches: (inst: any) => boolean): any`, `addConstantsApi(raw: Record<string, unknown>): Record<string, unknown>`, `createOriginApi(deps: { singletonClass: NonNullable<Targets["singletonClass"]>; constants: Record<string, unknown> }): { ensure(win: any): void; isReady(win: any): boolean }`
  - `ready.ts`: `READY_EVENT = "origin:ready"`, `markOriginReady(win: any): void`, `whenOriginReady(win: any): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
// extension/tests/runtime-api.test.ts
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { addConstantsApi, createOriginApi, discoverService } from "../lib/runtime/api.ts"
import { markOriginReady, READY_EVENT, whenOriginReady } from "../lib/runtime/ready.ts"

const makeGame = () => {
  const player = { data: { name: "x" }, appearanceChanged: false, unlockMemberItems() { this.unlocked = true }, unlocked: false }
  const membership = { _data: { active: false }, isMember: false, hasFeatureAccess() { return false }, updateMembershipDates() {} }
  const network = { getCharData() {}, processPlayer: 1, sendZoneEvent() {} }
  const services = new Map<unknown, unknown>([
    ["NotAnId", { player: { data: {} } }],
    ["1a2-3b4c", { player }],
    ["83f-419b", membership],
    ["ab-cd", network]
  ])
  const gameContainer = { _inversifyContainer: { _bindingDictionary: { _map: services } }, get: (id: unknown) => services.get(id) }
  const singleton = { prodigy: { gameContainer } as any, game: { state: { states: new Map([["Boot", { _gameData: { pet: [] } }]]) } } }
  class Singleton { static get instance() { return singleton } get prodigy() { return null } }
  const constants: Record<string, unknown> = { "GameConstants.Build.VERSION": "2026.18.1" }
  return { player, membership, network, gameContainer, singleton, Singleton, constants }
}

describe("discoverService", () => {
  it("returns the first hex-id binding matching the shape", () => {
    const g = makeGame()
    // "NotAnId" also has a player but is not a hex service id, so it is skipped.
    assert.equal(discoverService(g.gameContainer, (i) => "player" in i), g.gameContainer.get("1a2-3b4c"))
  })
  it("returns null without a binding map", () => {
    assert.equal(discoverService({}, () => true), null)
  })
})

describe("addConstantsApi", () => {
  it("adds hidden Map-like accessors over the same object", () => {
    const raw: Record<string, any> = { "GameConstants.Debug.EDUCATION_ENABLED": true }
    addConstantsApi(raw)
    raw.set("GameConstants.Debug.EDUCATION_ENABLED", false)
    assert.equal(raw["GameConstants.Debug.EDUCATION_ENABLED"], false)
    assert.equal(raw.get("GameConstants.Debug.EDUCATION_ENABLED"), false)
    assert.equal(raw.has("GameConstants.Debug.EDUCATION_ENABLED"), true)
    assert.equal(raw.constants, raw)
    assert.deepEqual(Object.keys(raw), ["GameConstants.Debug.EDUCATION_ENABLED"])
  })
})

describe("createOriginApi", () => {
  it("creates window._ and exposes instance, constants, player, network, gameData, membership", () => {
    const g = makeGame()
    const win: any = {}
    createOriginApi({ singletonClass: g.Singleton, constants: g.constants }).ensure(win)
    assert.equal(win._.instance, g.singleton)
    assert.equal(win._.constants, g.constants)
    assert.equal(win._.player, g.player)
    assert.equal(win._.network, g.network)
    assert.equal(win._.network.game, g.singleton.game)
    assert.deepEqual(win._.gameData, { pet: [] })
    assert.equal(win._.membership, g.membership)
  })

  it("re-applies after window._ is replaced and keeps lodash's functions", () => {
    const g = makeGame()
    const win: any = {}
    const api = createOriginApi({ singletonClass: g.Singleton, constants: g.constants })
    api.ensure(win)
    const lodashFunctions = () => []
    const lodash: any = Object.assign(function lodash() {}, { functions: lodashFunctions, cloneDeep: (x: unknown) => x })
    win._ = lodash
    api.ensure(win)
    assert.equal(win._, lodash)
    assert.equal(win._.instance, g.singleton)
    assert.equal(win._.functions, lodashFunctions)
    assert.equal(typeof win._.functions.setMembership, "function")
  })

  it("setMembership toggles and restores the original membership data", () => {
    const g = makeGame()
    const win: any = {}
    createOriginApi({ singletonClass: g.Singleton, constants: g.constants }).ensure(win)
    const original = g.membership._data
    assert.equal(win._.functions.setMembership(true), true)
    assert.equal((g.membership._data as any).active, true)
    assert.equal(g.membership.hasFeatureAccess(), true)
    assert.equal(g.player.unlocked, true)
    assert.equal(win._.functions.setMembership(false), true)
    assert.equal(g.membership._data, original)
    assert.equal(g.membership.hasFeatureAccess(), false)
  })

  it("keeps the original membership snapshot across re-apply", () => {
    const g = makeGame()
    const win: any = {}
    const api = createOriginApi({ singletonClass: g.Singleton, constants: g.constants })
    api.ensure(win)
    const original = g.membership._data
    win._.functions.setMembership(true)
    win._ = Object.assign(function lodash() {}, { functions: () => [] })
    api.ensure(win)
    win._.functions.setMembership(false)
    assert.equal(g.membership._data, original)
  })

  it("isReady waits for prodigy and player", () => {
    const g = makeGame()
    const win: any = {}
    const api = createOriginApi({ singletonClass: g.Singleton, constants: g.constants })
    const prodigy = g.singleton.prodigy
    g.singleton.prodigy = null
    api.ensure(win)
    assert.equal(api.isReady(win), false)
    g.singleton.prodigy = prodigy
    assert.equal(api.isReady(win), true)
  })
})

describe("ready signal", () => {
  it("resolves listeners registered before and after the signal", async () => {
    const win: any = new EventTarget()
    const early = whenOriginReady(win)
    let events = 0
    win.addEventListener(READY_EVENT, () => events++)
    markOriginReady(win)
    markOriginReady(win)
    await early
    await whenOriginReady(win)
    assert.equal(events, 1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd extension && node --experimental-strip-types --test tests/runtime-api.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

```ts
// extension/lib/runtime/api.ts
// The `window._` surface originGUI reads. Ported from the old P-NP suffix
// (P-NP/src/wrappers.ts), minus the parts that only existed because the
// patched bundle ran twice.

import type { Targets } from "./resolve"

type OriginApiDeps = {
  singletonClass: NonNullable<Targets["singletonClass"]>
  constants: Record<string, unknown>
}

const API_MARK = "__originApi"
const SERVICE_ID = /^[0-9a-f]{2,4}-[0-9a-f]{2,6}$/

const defineHidden = (target: object, key: PropertyKey, value: unknown) =>
  Object.defineProperty(target, key, { value, configurable: true, writable: true })

const defineGetter = (target: object, key: PropertyKey, get: () => unknown) =>
  Object.defineProperty(target, key, { get, configurable: true, enumerable: true })

// Service ids drift every build; enumerate Inversify bindings and match by shape.
export const discoverService = (gc: any, matches: (inst: any) => boolean): any => {
  let map: Map<unknown, unknown> | undefined
  try {
    map = gc._inversifyContainer._bindingDictionary._map
  } catch {
    return null
  }
  if (!map || typeof map.keys !== "function") return null
  for (const id of map.keys()) {
    if (typeof id !== "string" || !SERVICE_ID.test(id)) continue
    try {
      const inst = gc.get(id)
      if (inst && matches(inst)) return inst
    } catch {}
  }
  return null
}

// The menu writes `_.constants.constants[key]` and reads `_.constants.get(key)`;
// both must hit the object the game itself reads.
export const addConstantsApi = (raw: Record<string, unknown>): Record<string, unknown> => {
  if (typeof raw.get !== "function") {
    defineHidden(raw, "get", (key: string) => raw[key])
    defineHidden(raw, "set", (key: string, value: unknown) => {
      raw[key] = value
      return raw
    })
    defineHidden(raw, "has", (key: string) => key in raw)
    defineHidden(raw, "constants", raw)
  }
  return raw
}

const isPlayerService = (inst: any) => {
  try {
    const p = inst.player
    return !!p && typeof p === "object" && "data" in p
  } catch {
    return false
  }
}
const isNetworkManager = (inst: any) =>
  typeof inst.getCharData === "function" && "processPlayer" in inst && typeof inst.sendZoneEvent === "function"
const isMembershipService = (inst: any) => typeof inst.hasFeatureAccess === "function" && "isMember" in inst

export const createOriginApi = (deps: OriginApiDeps) => {
  const services: { player?: any; network?: any; membership?: any } = {}
  let membershipOriginal: { data: unknown } | undefined

  const instance = () => deps.singletonClass.instance ?? null
  const find = (key: keyof typeof services, matches: (inst: any) => boolean) => {
    if (services[key]) return services[key]
    const gc = instance()?.prodigy?.gameContainer
    if (!gc) return null
    const svc = discoverService(gc, matches)
    if (svc) services[key] = svc
    return svc
  }

  const apply = (target: any) => {
    defineGetter(target, "instance", instance)
    Object.defineProperty(target, "constants", {
      value: addConstantsApi(deps.constants),
      configurable: true,
      enumerable: true,
      writable: true
    })
    // The service caches the player; `.player` is a getter returning a fresh object.
    defineGetter(target, "player", () => find("player", isPlayerService)?.player ?? null)
    defineGetter(target, "gameData", () => {
      try {
        return instance()?.game?.state?.states?.get?.("Boot")?._gameData ?? null
      } catch {
        return null
      }
    })
    defineGetter(target, "network", () => {
      const nm = find("network", isNetworkManager)
      if (nm && !nm.game) {
        try {
          defineGetter(nm, "game", () => instance()?.game ?? null)
        } catch {}
      }
      return nm
    })
    defineGetter(target, "membership", () => find("membership", isMembershipService))

    const setMembership = (active: boolean): boolean => {
      const ms = find("membership", isMembershipService)
      if (!ms) return false
      if (!membershipOriginal) membershipOriginal = { data: ms._data }
      if (active) {
        const day = 86_400_000
        ms._data = {
          active: true,
          features: [],
          membershipStartTs: new Date(Date.now() - day).toISOString(),
          membershipEndTs: new Date(Date.now() + 10 * 365 * day).toISOString()
        }
        // memberTier derives from hasFeatureAccess, so this promotes to Ultra.
        defineHidden(ms, "hasFeatureAccess", () => true)
        try { ms.updateMembershipDates?.() } catch {}
        try { target.player?.unlockMemberItems?.() } catch {}
      } else {
        ms._data = membershipOriginal.data
        if (Object.getOwnPropertyDescriptor(ms, "hasFeatureAccess")) delete ms.hasFeatureAccess
        try { ms.updateMembershipDates?.() } catch {}
      }
      try {
        const p = target.player
        if (p) p.appearanceChanged = true
      } catch {}
      return true
    }
    // lodash owns `_.functions`; hang ours off it instead of replacing it.
    if (target.functions == null) target.functions = Object.create(null)
    defineHidden(target.functions, "setMembership", setMembership)

    defineHidden(target, API_MARK, true)
  }

  return {
    ensure(win: any): void {
      if (win._ == null) win._ = {}
      if (!win._[API_MARK]) apply(win._)
    },
    isReady(win: any): boolean {
      try {
        return !!(instance()?.prodigy && win._?.player)
      } catch {
        return false
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd extension && node --experimental-strip-types --test tests/runtime-api.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add extension/lib/runtime/api.ts extension/lib/runtime/ready.ts extension/tests/runtime-api.test.ts
git commit -m "feat(extension): packaged window._ API and origin:ready signal"
```

---

### Task 5: Runtime content script; retire the onreset injection (LIVE CHECKPOINT A)

**Files:**
- Create: `extension/contents/runtime.ts`
- Delete: `extension/contents/prodigy.ts`, `extension/contents/origin-bridge.ts`
- Replace: `extension/background.ts` (image redirects only)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: page globals `window._` (API) and `window.__ORIGIN_READY__`, and the `origin:ready` event.

- [ ] **Step 1: Write `extension/contents/runtime.ts`**

```ts
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
```

- [ ] **Step 2: Delete the old injection scripts**

```bash
git rm extension/contents/prodigy.ts extension/contents/origin-bridge.ts
```

- [ ] **Step 3: Replace `extension/background.ts`**

```ts
// Background service worker for Play Origin (Chrome Web Store build).
//
// Only job: register the DNR rules that swap Prodigy's login background and
// logo for Play Origin art. No script blocking, no header stripping, and no
// code fetching; the game runs its own game.min.js.

const RULES: chrome.declarativeNetRequest.Rule[] = [
  {
    id: 3,
    priority: 2,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: { url: "https://raw.githubusercontent.com/ProdigyPXP/ProdigyOrigin/master/.github/origin-bg.png" }
    },
    condition: {
      urlFilter: "*://cdn.prodigygame.com/game/assets/v1_cache/single-images/login-bg-13/1/login-bg-13.png",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        chrome.declarativeNetRequest.ResourceType.IMAGE,
        chrome.declarativeNetRequest.ResourceType.OTHER
      ]
    }
  },
  {
    id: 4,
    priority: 2,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: { url: "https://raw.githubusercontent.com/ProdigyPXP/ProdigyOrigin/master/.github/origin-logo.png" }
    },
    condition: {
      urlFilter: "*://code.prodigygame.com/assets/svg/*logo*-*.svg",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        chrome.declarativeNetRequest.ResourceType.IMAGE,
        chrome.declarativeNetRequest.ResourceType.OTHER
      ]
    }
  }
]

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: RULES
  })
  console.log("[Origin] DeclarativeNetRequest rules registered successfully")
})
```

`onInstalled` clears the old block and CSP-strip rules (ids 1, 2) that a previous install left behind.

- [ ] **Step 4: Unit tests still pass, typecheck, dev build**

Run: `cd extension && pnpm test && pnpm typecheck`
Expected: every `runtime-*` test passes. Old pipeline tests (`patches`, `manifest`, `bundle-cache`, `patch-urls`, `integration`) still pass because their lib files still exist; Task 7 deletes them.

Run: `cd extension && pnpm dev` (background). Expected: Plasmo prints the `build/chrome-mv3-dev` output with no errors.

- [ ] **Step 5: LIVE CHECKPOINT A (user)**

The user loads `extension/build/chrome-mv3-dev` unpacked. If the production Play Origin extension is installed, the user disables it first. Then they open `https://math.prodigygame.com/` and log in. Verify:
1. Network: `code.prodigygame.com/code/*/game.min.js` returns 200, not blocked.
2. Console shows `[Origin] packaged runtime active`, three `[Origin] hook installed:` lines, and no `hook target missing`.
3. In the console: `_.instance.prodigy`, `_.constants.get("GameConstants.Build.VERSION")`, `_.player.data`, `_.network` and `_.membership` are all non-null. `__ORIGIN_READY__ === true`.
4. `_.constants.set("GameConstants.Debug.EDUCATION_ENABLED", false)`, then enter a battle and attack: no question appears and the attack goes through.

If any check fails, debug with systematic-debugging before Task 6.

- [ ] **Step 6: Commit**

```bash
git add extension/contents/runtime.ts extension/background.ts
git commit -m "feat(extension): load Prodigy's own game.min.js with packaged runtime hooks

Removes the onreset injection, bridge, game.min.js block and CSP strip."
```

---

### Task 6: Package the menu (LIVE CHECKPOINT B)

**Files:**
- Modify: `originGUI/build.mjs` (emit `dist/menu.js` + `dist/menu.d.ts`)
- Modify: `originGUI/src/index.ts` (drop dev socket eval and socket.io import)
- Modify: `originGUI/src/hacks/utility.ts` (drop "Update menu" and "Eval Console")
- Modify: `originGUI/src/hacks/beta.ts` (drop "Switch Branch")
- Modify: `originGUI/src/hacks/player.ts:422`, `originGUI/src/hacks/pets.ts:170` (closures instead of eval)
- Modify: `.gitignore`, `extension/package.json` scripts
- Create: `extension/contents/menu.ts`
- Rebuild + commit: `originGUI/dist/bundle.js`

**Interfaces:**
- Consumes: `whenOriginReady` from `lib/runtime/ready.ts`.
- Produces: `originGUI/dist/menu.js` with `export default function startOriginMenu(): void`.

- [ ] **Step 1: Remove remote/dynamic code paths from originGUI**

In `originGUI/src/index.ts`: delete the line `import { io } from "socket.io-client"; // Import socket.io-client` and the whole `if (process.env.NODE_ENV === "development") { const socket = io(...) ... eval(data); ... }` block.

In `originGUI/src/hacks/utility.ts`: delete everything from `// Begin Update menu` through `// End Update menu`, and from `// Begin Eval Console` through `// End Eval Console`.

In `originGUI/src/hacks/beta.ts`: delete from `// Begin Switch Branch` through the closing `});` of that `new Hack(category.beta, "Switch Branch", ...)` call (it ends with `return await eval(await (await fetch(...)).text());\n});`), including an `// End Switch Branch` marker if present.

In `originGUI/src/hacks/player.ts` replace
```ts
    eval(`player.getLevel = () => {return ${level.value}}`);
```
with
```ts
    player.getLevel = () => Number(level.value);
```

In `originGUI/src/hacks/pets.ts` replace
```ts
    // sorry in advance
    eval(`player.kennel.petTeam[parseInt(${pet.value})+1].getLevel = () => {return ${num}}`);
```
with
```ts
    player.kennel.petTeam[parseInt(pet.value) + 1].getLevel = () => Number(num);
```

Verify: `grep -rnE "eval\(|new Function|socket\.io|raw\.githubusercontent.*bundle" originGUI/src` prints nothing.

- [ ] **Step 2: Emit the menu module from `originGUI/build.mjs`**

Below `const bundlePath = ...` add:
```js
const menuModulePath = path.join(distDir, "menu.js");
const menuTypesPath = path.join(distDir, "menu.d.ts");
```
Below `createScssPlugin` add:
```js
// Wraps the IIFE bundle in a function so the Chrome extension can package the
// menu inside a content script and start it once the game is ready.
async function writeMenuModule () {
	const bundle = await fs.promises.readFile(bundlePath, "utf8");
	await fs.promises.writeFile(menuModulePath, `// Generated by originGUI/build.mjs. Do not edit.\nexport default function startOriginMenu () {\n${bundle}\n}\n`);
	await fs.promises.writeFile(menuTypesPath, "export default function startOriginMenu (): void;\n");
}
```
At the end of `buildBundle`, after `await esbuild.build({...});`, add `await writeMenuModule();`.

Append to `.gitignore`:
```
# Generated menu module for the Chrome extension
originGUI/dist/menu.js
originGUI/dist/menu.d.ts
```

- [ ] **Step 3: Menu content script**

```ts
// extension/contents/menu.ts
import type { PlasmoCSConfig } from "plasmo"
import startOriginMenu from "../../originGUI/dist/menu.js"
import { whenOriginReady } from "../lib/runtime/ready"

export const config: PlasmoCSConfig = {
  matches: ["https://math.prodigygame.com/*"],
  run_at: "document_idle",
  world: "MAIN"
}

// originGUI reads window._.player at load, so start only once the game is ready.
whenOriginReady(window).then(() => {
  try {
    startOriginMenu()
    console.log("[Origin] menu started")
  } catch (e) {
    console.error("[Origin] menu failed to start:", e)
  }
})
```

- [ ] **Step 4: Build originGUI before the extension**

In `extension/package.json` `scripts`:
```json
"menu": "pnpm --dir ../originGUI build",
"dev": "pnpm run menu && plasmo dev",
"build": "pnpm run menu && plasmo build",
"package": "pnpm run menu && plasmo package",
"typecheck": "pnpm run menu && tsc --noEmit",
```
(leave `dev:firefox`, `build:firefox`, `package:firefox`, `test` unchanged).

- [ ] **Step 5: Build and verify**

Run: `cd extension && pnpm typecheck && pnpm build`
Expected: success. Then `grep -c "startOriginMenu\|origin-menu" build/chrome-mv3-prod/menu.*.js` is ≥ 1. The menu code is inside the content script.

Run: `head -c 200 ../originGUI/dist/bundle.js; tail -c 60 ../originGUI/dist/bundle.js`. The bundle must not end with `/* DEV BUNDLE */`.

- [ ] **Step 6: LIVE CHECKPOINT B (user)**

Restart `pnpm dev`, reload the unpacked extension, and hard-reload Prodigy. Verify that `[Origin] menu started` is logged, the menu renders with ▲/▼, Shift toggles it, the "Disable math" hack (battle.ts `setConstant(EDUCATION_ENABLED,false)`) works in a battle, and membership on/off works.

- [ ] **Step 7: Commit**

```bash
git add .gitignore originGUI/build.mjs originGUI/src originGUI/dist/bundle.js extension/contents/menu.ts extension/package.json
git commit -m "feat: package originGUI into the Chrome extension, drop remote menu loading and evals"
```

---

### Task 7: Remove the dead pipeline, tighten the manifest, update docs

**Files:**
- Delete: `extension/lib/{bundle-cache,manifest,patches,patch-urls}.ts`, `extension/tests/{bundle-cache,manifest,patches,patch-urls,integration}.test.ts`
- Modify: `extension/popup.tsx` (drop Developer Options / URL overrides), `extension/package.json` (manifest permissions)
- Modify: `CLAUDE.md`, `.claude/architecture.md`, `.claude/workflow.md`

- [ ] **Step 1: Delete pipeline code and its tests**

```bash
git rm extension/lib/bundle-cache.ts extension/lib/manifest.ts extension/lib/patches.ts extension/lib/patch-urls.ts \
  extension/tests/bundle-cache.test.ts extension/tests/manifest.test.ts extension/tests/patches.test.ts \
  extension/tests/patch-urls.test.ts extension/tests/integration.test.ts
grep -rn "lib/patches\|lib/manifest\|lib/bundle-cache\|lib/patch-urls" extension --include=*.ts --include=*.tsx | grep -v node_modules | grep -v "^extension/firefox"
```
Expected: grep prints nothing.

- [ ] **Step 2: Popup: remove the manifest/menu URL overrides**

In `extension/popup.tsx`: delete the `manifestUrl`, `guiUrl`, `saved`, `devOpen`, `devUnlocked` and `challengeInput` state, the `useEffect` that reads `chrome.storage.local`, and `handleSave`/`handleReset`. Delete the JSX from `{/* Developer Options accordion */}` through the end of its `<AnimatePresence>` block. Remove imports that become unused (check `Save`, `RotateCcw`, `ChevronDown`, `motion`, `AnimatePresence`, `useEffect`, `useState`). Then run `pnpm typecheck`. It must pass with no unused-symbol errors, and `grep -n "chrome.storage" popup.tsx` must print nothing.

- [ ] **Step 3: Manifest permissions**

In `extension/package.json` → `manifest`:
```json
"permissions": ["declarativeNetRequest"],
"host_permissions": ["*://*.prodigygame.com/*"],
```
Check: `grep -rn "chrome.storage" extension --include=*.ts --include=*.tsx | grep -v node_modules | grep -v firefox` prints nothing.

- [ ] **Step 4: Docs**

`CLAUDE.md`: replace rules 5 and 6 with:
```
5. **No remote code on `chrome/packaged-runtime`** — the Chrome build must never fetch-and-run JavaScript, use `onreset`, `eval`, or `new Function`. Hooks live in `extension/lib/runtime/`; the menu is packaged via `extension/contents/menu.ts`. Master keeps the P-NP `onreset` pipeline for Edge/Firefox.
6. **Graceful degradation** — a hook target that stops resolving logs `[Origin] hook target missing: <names>`; the other hooks keep working. A missing target means a Chrome Web Store resubmission.
```
`.claude/architecture.md`: replace the `extension/` bullet list, the "Injection method" / "Content script" / "Window globals" / "DOM attributes" / "Storage keys" lines, and the `extension/` part of Key Files, with a description of: `contents/runtime.ts` (defineProperty hook → resolve → bypasses + `window._`), `contents/menu.ts`, `lib/runtime/{modules,resolve,bypasses,api,ready}.ts`, `background.ts` (image redirects only), window globals `_` and `__ORIGIN_READY__`, event `origin:ready`, and the table of hook targets from the spec.
`.claude/workflow.md`: under Testing, replace "Verify DNR rules are active" with the Task 5 checkpoint A list.

- [ ] **Step 5: Full verification**

```bash
cd extension && pnpm test && pnpm typecheck && pnpm build
grep -rlE "onreset|raw\.githubusercontent\.com/ProdigyPXP/(P-NP|ProdigyOrigin/[^\"]*/originGUI/dist)" build/chrome-mv3-prod || echo "clean: no remote-code references"
grep -rnoE "\beval\(|new Function\(" build/chrome-mv3-prod | head
```
Expected: tests, typecheck and build pass, and the first grep prints `clean: ...`. Any hit from the second grep must be inside third-party library code (e.g., sweetalert2, React). Record it in the final report. Play Origin code must have none.

- [ ] **Step 6: Commit**

```bash
git add -A extension/popup.tsx extension/package.json CLAUDE.md .claude/architecture.md .claude/workflow.md
git commit -m "chore(extension): drop P-NP pipeline, URL overrides and unused permissions from Chrome build"
```
