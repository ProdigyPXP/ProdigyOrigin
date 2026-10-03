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
