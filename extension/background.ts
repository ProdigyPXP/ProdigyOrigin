// Background service worker for Play Origin (Chrome Web Store build).
//
// Only job: register the DNR rules that swap Prodigy's login background and
// logo for Play Origin art. No script blocking, no header stripping, and no
// code fetching; the game runs its own game.min.js. The art is packaged and
// web-accessible, because Prodigy's img-src CSP blocks a GitHub-hosted copy.

const RULES: chrome.declarativeNetRequest.Rule[] = [
  {
    id: 3,
    priority: 2,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: { extensionPath: "/assets/origin-bg.png" }
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
      redirect: { extensionPath: "/assets/origin-logo.png" }
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
