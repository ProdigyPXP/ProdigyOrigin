// Background service worker for Play Origin (Chromium MV3).
//
// Responsibilities:
// 1. DNR rules: BLOCK original game.min.js + strip CSP/X-Frame-Options +
//    redirect login background and logo.
// 2. Handle GET_PATCHED_BUNDLE messages from the ISOLATED-world bridge:
//    fetch manifest.json, check the cache, fetch + patch the original on miss,
//    return the patched JS source.

import {
  MANIFEST_URL,
  gameVersionFromUrl
} from "./lib/patch-urls"
import {
  applyPatchRules,
  wrapWithPrefixSuffix
} from "./lib/patches"
import { validateManifest, type Manifest } from "./lib/manifest"
import {
  getCachedBundle,
  setCachedBundle,
  type CacheEntry,
  type StorageLocalApi
} from "./lib/bundle-cache"

const RULES: chrome.declarativeNetRequest.Rule[] = [
  {
    id: 1,
    priority: 1,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: "*://code.prodigygame.com/code/*/game.min.js*",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT]
    }
  },
  {
    id: 2,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        { header: "Content-Security-Policy", operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE },
        { header: "X-Frame-Options", operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE }
      ]
    },
    condition: {
      urlFilter: "*://*.prodigygame.com/*",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME
      ]
    }
  },
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
  const existingIds = existing.map((r) => r.id)
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: RULES
  })
  console.log("[Origin] DeclarativeNetRequest rules registered successfully")
})

const fetchManifest = async (): Promise<Manifest> => {
  const r = await fetch(MANIFEST_URL, { cache: "default" })
  if (!r.ok) throw new Error(`manifest.json HTTP ${r.status}`)
  const json = (await r.json()) as unknown
  return validateManifest(json)
}

const fetchOriginal = async (url: string): Promise<string> => {
  const r = await fetch(url, { cache: "default" })
  if (!r.ok) throw new Error(`original game.min.js HTTP ${r.status} for ${url}`)
  const body = await r.text()
  if (body.length < 1000) {
    throw new Error(`original game.min.js suspiciously small (${body.length} bytes)`)
  }
  return body
}

const getOrBuildPatchedBundle = async (originalUrl: string): Promise<string> => {
  const storage = chrome.storage.local as unknown as StorageLocalApi
  const gameClientVersion = gameVersionFromUrl(originalUrl)
  if (!gameClientVersion) throw new Error(`unparseable originalUrl: ${originalUrl}`)

  const manifest = await fetchManifest()
  const cached = await getCachedBundle(storage)
  if (
    cached &&
    cached.gameClientVersion === gameClientVersion &&
    cached.manifestHash === manifest.hash
  ) {
    console.log(
      `[Origin] cache HIT for ${gameClientVersion} (hash=${manifest.hash})`
    )
    return cached.patchedBundle
  }

  console.log(
    `[Origin] cache MISS for ${gameClientVersion} (hash=${manifest.hash}) — building`
  )
  const original = await fetchOriginal(originalUrl)
  const { output: patchedCore, perRuleCounts } = applyPatchRules(original, manifest.rules)
  for (const rule of manifest.rules) {
    console.log(`[Origin] rule "${rule.id}" matched ${perRuleCounts[rule.id] ?? 0}x`)
  }
  const patchedBundle = wrapWithPrefixSuffix(patchedCore, manifest.prefix, manifest.suffix)

  const entry: CacheEntry = {
    gameClientVersion,
    manifestHash: manifest.hash,
    patchedBundle,
    storedAt: Date.now()
  }
  await setCachedBundle(storage, entry)
  console.log(`[Origin] cache STORED for ${gameClientVersion}`)
  return patchedBundle
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "GET_PATCHED_BUNDLE" || typeof msg.originalUrl !== "string") {
    return false
  }
  getOrBuildPatchedBundle(msg.originalUrl)
    .then((patchedBundle) => sendResponse({ ok: true, patchedBundle }))
    .catch((err: unknown) => {
      console.error("[Origin] GET_PATCHED_BUNDLE failed:", err)
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      })
    })
  return true
})

export {}
