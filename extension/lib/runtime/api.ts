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
  // Own hasFeatureAccess descriptor, if the service had one before we overrode it.
  let membershipOriginal: { data: unknown; hasFeatureAccess?: PropertyDescriptor } | undefined

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
      if (!membershipOriginal) {
        membershipOriginal = { data: ms._data, hasFeatureAccess: Object.getOwnPropertyDescriptor(ms, "hasFeatureAccess") }
      }
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
        if (membershipOriginal.hasFeatureAccess) Object.defineProperty(ms, "hasFeatureAccess", membershipOriginal.hasFeatureAccess)
        else delete ms.hasFeatureAccess
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
