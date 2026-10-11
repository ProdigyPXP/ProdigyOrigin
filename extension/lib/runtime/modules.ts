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
