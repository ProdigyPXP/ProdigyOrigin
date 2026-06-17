export const CACHE_KEY = "patchedBundleCache"

export type CacheEntry = {
  gameClientVersion: string
  manifestHash: string
  patchedBundle: string
  storedAt: number
}

export type StorageLocalApi = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
  remove: (keys: string | string[]) => Promise<void>
}

export const getCachedBundle = async (
  storage: StorageLocalApi
): Promise<CacheEntry | undefined> => {
  const result = await storage.get(CACHE_KEY)
  const v = result[CACHE_KEY]
  if (!v || typeof v !== "object") return undefined
  const e = v as Partial<CacheEntry>
  if (
    typeof e.gameClientVersion !== "string" ||
    typeof e.manifestHash !== "string" ||
    typeof e.patchedBundle !== "string" ||
    typeof e.storedAt !== "number"
  ) {
    return undefined
  }
  return e as CacheEntry
}

export const setCachedBundle = async (
  storage: StorageLocalApi,
  entry: CacheEntry
): Promise<void> => {
  await storage.set({ [CACHE_KEY]: entry })
}

export const clearCachedBundle = async (
  storage: StorageLocalApi
): Promise<void> => {
  await storage.remove(CACHE_KEY)
}
