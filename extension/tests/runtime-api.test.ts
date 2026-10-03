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
