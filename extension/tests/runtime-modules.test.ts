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
