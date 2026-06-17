import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CACHE_KEY,
  getCachedBundle,
  setCachedBundle,
  clearCachedBundle,
  type StorageLocalApi,
  type CacheEntry
} from "../lib/bundle-cache.ts";

const makeFakeStorage = (initial: Record<string, unknown> = {}): StorageLocalApi => {
  let store: Record<string, unknown> = { ...initial };
  return {
    get: async (keys) => {
      if (typeof keys === "string") return { [keys]: store[keys] };
      if (Array.isArray(keys)) {
        const out: Record<string, unknown> = {};
        for (const k of keys) out[k] = store[k];
        return out;
      }
      return { ...store };
    },
    set: async (items) => { store = { ...store, ...items }; },
    remove: async (keys) => {
      const ks = Array.isArray(keys) ? keys : [keys];
      for (const k of ks) delete store[k];
    }
  };
};

const entry: CacheEntry = {
  gameClientVersion: "2026.18.1",
  manifestHash: "deadbeef00000000",
  patchedBundle: "console.log(1)",
  storedAt: 1000
};

describe("getCachedBundle", () => {
  it("returns undefined when nothing stored", async () => {
    const r = await getCachedBundle(makeFakeStorage());
    assert.equal(r, undefined);
  });

  it("returns the stored entry", async () => {
    const r = await getCachedBundle(makeFakeStorage({ [CACHE_KEY]: entry }));
    assert.deepEqual(r, entry);
  });

  it("returns undefined when stored shape is invalid", async () => {
    const r = await getCachedBundle(makeFakeStorage({ [CACHE_KEY]: { wrong: true } }));
    assert.equal(r, undefined);
  });
});

describe("setCachedBundle", () => {
  it("writes the entry", async () => {
    const s = makeFakeStorage();
    await setCachedBundle(s, entry);
    assert.deepEqual(await getCachedBundle(s), entry);
  });

  it("overwrites prior entries", async () => {
    const s = makeFakeStorage();
    await setCachedBundle(s, entry);
    await setCachedBundle(s, { ...entry, gameClientVersion: "2026.19.0" });
    const got = await getCachedBundle(s);
    assert.equal(got?.gameClientVersion, "2026.19.0");
  });
});

describe("clearCachedBundle", () => {
  it("removes the entry", async () => {
    const s = makeFakeStorage({ [CACHE_KEY]: entry });
    await clearCachedBundle(s);
    assert.equal(await getCachedBundle(s), undefined);
  });

  it("no-ops when nothing is stored", async () => {
    await clearCachedBundle(makeFakeStorage());
  });
});
