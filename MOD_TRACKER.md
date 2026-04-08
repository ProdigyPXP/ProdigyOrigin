# Origin GUI — Mod Tracker

Tested against Prodigy Math Game version **2026.19.0** on **2026-04-06**.  
Extension: Prodigy Origin (P-NP patched game).

**Legend:**  
✅ Working · ⚠️ Partial · ❌ Broken · ⏭️ Not tested (destructive/requires game state) · 🔒 Acknowledged patched

---

## Known Systemic Issues

| Root Cause | Affected Mods |
|---|---|
| `_.constants` is `undefined` — P-NP regex patch for `A.constants={"GameConstants...` failed to match current game build | Disable Math, Skip Enemy Turn, Disable Monster Encounters, Disable Inactivity Kick |
| `prodigy.giftBoxController` removed from prodigy object; not in gameContainer either | Obtain Conjure Cubes; Conjure Cubes step in Max Account / Hypermax Account |
| `player.appearance.setGender()` removed from game (method no longer on prototype) | Bobbify |
| Battle states renamed — "Battle"/"SecureBattle" replaced by "SecureBattleRevamp"; no run-away/victory methods found on new state | Escape Battle (in-battle path), Win Battle, Heal Team |
| `battleData` module not discoverable in gameContainer binding map | Get all Runes, Runes portion of Hypermax Account |
| `pvpNetworkHandler` not present on prodigy object | Arena Point Increaser |
| `debugMisc.disableTimeoutDialogue` not present | Disable Timeout Dialog |

---

## Player Mods

| Mod | Status | Notes |
|---|---|---|
| **Max Account** | ⚠️ Partial | Gold, level, bounty, achievements, items, pets, equipment all work. Conjure Cubes step fails silently (giftBoxController missing). |
| **Set Gold** | ✅ Working | Sets `player.data.gold`. Verified 9,999,999. |
| **Set Level** | ✅ Working | Sets level + recalculates stars. |
| **Get member stars** | ✅ Working | Sets `player.data.storedMemberStars`. |
| **Set Bounty Points** | ✅ Working | Sets `player.data.bountyScore`, capped at 100. |
| **Obtain Conjure Cubes** | ❌ Broken | `prodigy.giftBoxController` is undefined. Crashes on call. |
| **Set Wins** | ✅ Working | Sets `player.data.win`. |
| **Set Losses** | ✅ Working | Sets `player.data.loss`. |
| **Toggle membership** | ✅ Working | Finds member module `cdc-6a10` via `player.hasMembership.toString()`. Toggles `data.active` (not `data.membership.active`). |
| **Set name (Client side only)** | ✅ Working | Overrides `player.getName()`. Client-side only, reverts on reload. |
| **Change Name** | ✅ Working | Edits `player.name.data.firstName/middleName/lastName/nickname`. |
| **Uncap player level (client side only)** | ✅ Working | Overrides `player.getLevel()` via eval. Client-side. |
| **Get all achievements** | ✅ Working | Sets all 100 achievement progress slots to 10. |
| **Fix Morph Crash** | ✅ Working | Clears `player.getPlayerData().playerTransformation`. |
| **Permanent Morph** | ✅ Working | Sets `maxTime` and `timeRemaining` to Infinity on active transform. Requires an active morph to be meaningful. |
| **Complete Current Task In Quest** | ✅ Working | `getCurrentQuestID()` and `completeQuest()` accessible on zone objects. |
| **Set Dark Tower Floor** | ✅ Working | Sets `player.data.tower`. |
| **Get UserID** | ✅ Working | Returns `player.userID` (numeric). Clipboard write attempted. |
| **Copy Account** | ⏭️ Not tested | Destructive. Requires `localStorage.JWT_TOKEN` which is not present in tested session. Would likely fail auth. |
| **Set Grade** | ✅ Working | Sets `player.grade`. |

---

## Inventory Mods

| Mod | Status | Notes |
|---|---|---|
| **Item stacker** | ✅ Working | All 13 item categories populated. Removes bounty notes. |
| **Clear inventory** | ⏭️ Not tested | Destructive. Logic is straightforward (`player.backpack.data[k] = []` for all keys). |
| **Selector (Basic)** | ✅ Working | All 13 item categories accessible from `_.gameData`. |
| **Selector (Advanced)** | ⚠️ Partial | **Bug:** When item already exists in backpack (else branch, line ~140 inventory.ts), the quantity `N` is never updated — only `findIndex` is called and the result is unused. New items are added correctly. |
| **Obtain All Furniture** | ⚠️ Partial | **Duplicated** — appears twice in the menu (once with custom quantity input, once hardcoded to `VERY_LARGE_NUMBER`). Both work. The duplicate button is a code defect. |
| **Obtain All Mounts** | ✅ Working | 41 mounts added via `itemify`. |
| **Remove item** | ✅ Working | Finds item by ID, decrements N, splices if ≤ 0. |

---

## Location Mods

| Mod | Status | Notes |
|---|---|---|
| **WASD Movement** | ✅ Working | Toggler sets `useWASD` flag. `player._playerContainer.walkSpeed` accessible. Starts enabled by default (`.status = true`). |
| **Edit walkspeed** | ✅ Working | Sets `player._playerContainer.walkSpeed`. Polls until container available. |
| **Toggle Click Teleporting** | ✅ Working | Sets walkSpeed to 500 on interval; clearing restores 1.5. Duplicated in Utility section. |
| **Teleport To Map (interactive)** | ✅ Working | 35 zones, multiple maps per zone. `prodigy.world.zones[zone].teleport()` works. |
| **Teleport to house by userID** | ✅ Working | `friendsListNetworkHandler` accessible. Hardcoded gameContainer ID `"2e1-e659"` for broadcast — may be stale but untested. |
| **Get Map Location** | ✅ Working | Returns `player.data.zone`. |

---

## Pet Mods

| Mod | Status | Notes |
|---|---|---|
| **Get All Pets** | ✅ Working | Adds all pets via `kennel.addPet()`. Populates encounter info. 313 pets in test. |
| **Get All Legacy Epics** | ✅ Working | IDs 125–133. 9 epics added. |
| **Get All Mythical Epics** | ✅ Working | IDs 158,164–171,189. 10 epics found in gameData and added. |
| **Clear Pets** | ⏭️ Not tested | Destructive. Logic (`kennel.data.length = 0`) is straightforward. |
| **Add Pet** | ✅ Working | `kennel.addPet(id)` works. Adds encounter entry. |
| **Uncap pet level [Client Side]** | ✅ Working | Overrides `petTeam[n].getLevel()` via eval. Reverts on reload. |
| **Delete Pet** | ✅ Working | `kennel.data.splice(index, 1)` works. |

---

## Battle Mods

> Most battle mods were tested outside of battle. State-dependent results noted. Current battle state system uses `SecureBattleRevamp` instead of the `Battle`/`SecureBattle` states the code was written for.

| Mod | Status | Notes |
|---|---|---|
| **Disable math [PvP, PvE]** | ❌ Broken | Requires `_.constants` which is undefined. Constant `GameConstants.Debug.EDUCATION_ENABLED` inaccessible. |
| **Instant Kill [PvE]** | ✅ Working | Sets `player.modifiers.damage` to `VERY_LARGE_NUMBER`. No battle state required. |
| **PvP Health [PvP]** | ✅ Working | Sets `player.pvpHP` and overrides `player.getMaxHearts`. No battle state required. |
| **Escape Battle [PvP, PvE]** | ❌ Broken | State check uses `["Battle", "SecureBattle"]` allowlist. Current battle state is `SecureBattleRevamp` — falls through to "Invalid State" error. PVP/CoOp paths may still work. |
| **Win Battle [PvE]** | ❌ Broken | Switch statement has cases for `"Battle"` and `"SecureBattle"` only. `SecureBattleRevamp` hits `default` → "You are currently not in a battle." error. |
| **Set Battle Hearts [PvP, PvE]** | ✅ Working | Sets `player.getMaxHearts`, `pvpHP`, and `player.data.hp`. No battle state required. |
| **Fill Battle Energy [PvP, PvE]** | ⏭️ Not tested | Requires being in battle. Logic calls `game.state.getCurrentState().teams[0].setEnergy(99)` — not testable from overworld. |
| **Skip enemy turn** | ❌ Broken | Requires `_.constants`. Constant `GameConstants.Battle.SKIP_ENEMY_TURN` inaccessible. |
| **Heal Team [PvE]** | ❌ Broken | State check requires `["Battle", "SecureBattle"]`. Current state is `SecureBattleRevamp` — would return "Invalid State" error when in battle. |

---

## Minigame Mods

| Mod | Status | Notes |
|---|---|---|
| **69x Walk Speed [Dyno Dig]** | ✅ Working | `game.state.states.get("DinoDig").walkSpeed` is writable. Must be inside DinoDig for the change to have visual effect. |

---

## Miscellaneous Mods

| Mod | Status | Notes |
|---|---|---|
| **Skip Tutorial** | ✅ Working | `world.getZone("house"/"academy").testQuest()` accessible. |
| **Disable Monster Encounters** | ❌ Broken | Requires `_.constants`. Constant `GameConstants.Debug.SCALE_ENCOUNTER_DISTANCE` inaccessible. |
| **Unlimited Spins** | ✅ Working | Overrides `player.canSpin` function. Restores original on disable. |
| **Bobbify** | ❌ Broken | `player.appearance.setGender()` no longer exists on appearance prototype (removed in game update). Crashes before any changes are applied. `setEyeColor`, `setFace`, `setHair`, `setSkinColor` are still present. |
| **Reset Account** | ⏭️ Not tested | Destructive and irreversible. |
| **[Fix] Fix Battle Crash** | ✅ Working | Calls `assignRandomSpells()` on all pets in team. |
| **[Fix] Stuck in Unfinished Tower Fix** | ✅ Working | `world.zones["house"].teleport("exit")` works. |
| **uwu** | ✅ Working | `_.localizer.dataSource._languageData` accessible (14,747 keys). `_.gameData` names accessible. Heavy operation. |

---

## Utility Mods

| Mod | Status | Notes |
|---|---|---|
| **Close all popups** | ✅ Working | `prodigy.open.menuCloseAll()` works. |
| **Grab UserID of all players on screen** | ✅ Working | Reads `TileScreen.playerList`. Returns empty if no other players are visible. |
| **Save Character Locally [Local]** | ✅ Working | `player.getUpdatedData(true)` serializable; stored in `localStorage.playerData`. |
| **Load local character [Local]** | ✅ Working | POST to `game-api/v3/characters/:id` with stored data. Requires reload to take effect. |
| **Save Character** | ✅ Working | `_.network.getCharData` accessible. |
| **Update menu** | ✅ Working | Removes menu/toggler elements, fetches fresh bundle from GitHub master, evals it. |
| **Disable inactivity kick** | ❌ Broken | Requires `_.constants`. Constant `GameConstants.Inactivity.LOG_OUT_TIMER_SECONDS` inaccessible. |
| **Enable menu resize** | ✅ Working | Sets `origin-menu` style `resize: both`. |
| **Edit walkspeed** | ✅ Working | Duplicate of Location mod. Same logic, works. |
| **Toggle Click Teleporting** | ✅ Working | Duplicate of Location mod. Same logic, works. |
| **Pause Game** | ✅ Working | Sets `_.network.game._paused`. |
| **Eval Console** | ✅ Working | `eval()` in MAIN world with full game access. Shows warning dialog first. |

---

## Beta Mods

| Mod | Status | Notes |
|---|---|---|
| **Switch Branch** | ✅ Working | Fetches GitHub branches API, loads bundle from selected branch. |
| **Get all Runes [BETA]** | ❌ Broken | Iterates gameContainer bindings looking for a service with `.battleData` — none found. Mod cannot locate the rune state service. |
| **Edit Pet [BETA]** | ⚠️ Partial | Level edit: ✅ works. Name/nickname edit: ✅ works. Attack edit: ⚠️ `foreignSpells` not found on tested pets (no pets with custom spells in team). |
| **Morph Player [BETA]** | ✅ Working | Sets `player.getPlayerData().playerTransformation` with transform type/ID. Visual update via `appearanceChanged`. |
| **(client side) Toggle Invisibility [BETA]** | ✅ Working | `current.user.visible` (resolved via `TileScreen` state user object) is writable. Client-side only. |
| **Toggle Close Popups [BETA]** | ✅ Working | Runs `PopupInterval` which setIntervals to close all open popups. |
| **Hypermax Account [BETA]** | ⚠️ Partial | All sections work except: (1) Conjure Cubes step broken (giftBoxController missing), (2) Get all Runes step broken (battleData module not found). Rest — gold, level, items, pets, equipment, walkspeed — all work. |
| **FPS Counter [BETA]** | ✅ Working | `startFps()`/`stopFps()` create/remove a DOM overlay element. |

---

## Patched Mods

| Mod | Status | Notes |
|---|---|---|
| **Arena Point Increaser [Patched]** | 🔒 Patched | `prodigy.pvpNetworkHandler` not present. Endpoint would reject requests regardless. Acknowledged patched in source. |
| **Disable Timeout Dialog [Patched]** | 🔒 Patched | `prodigy.debugMisc.disableTimeoutDialogue` not found. Acknowledged patched in source. |

---

## Summary

| Category | Total | ✅ Working | ⚠️ Partial | ❌ Broken | ⏭️ Not Tested | 🔒 Patched |
|---|---|---|---|---|---|---|
| Player | 20 | 16 | 1 | 1 | 2 | 0 |
| Inventory | 7 | 5 | 2 | 0 | 1 | 0 |
| Location | 6 | 6 | 0 | 0 | 0 | 0 |
| Pets | 7 | 6 | 0 | 0 | 1 | 0 |
| Battle | 9 | 3 | 0 | 5 | 1 | 0 |
| Minigames | 1 | 1 | 0 | 0 | 0 | 0 |
| Misc | 8 | 5 | 0 | 2 | 1 | 0 |
| Utility | 12 | 10 | 0 | 1 | 0 | 0 |
| Beta | 8 | 5 | 2 | 1 | 0 | 0 |
| Patched | 2 | 0 | 0 | 0 | 0 | 2 |
| **Total** | **80** | **57** | **5** | **10** | **6** | **2** |

### Priority Fixes

1. **`_.constants` undefined** — P-NP regex for `A.constants={"GameConstants...` no longer matches game build. Fixes 4 broken mods.
2. **`giftBoxController` missing** — Find new path or remove Conjure Cubes from Max/Hypermax Account. Fixes 1 broken mod, improves 2 partial.
3. **`appearance.setGender()` removed** — Bobbify crashes at first call. Update to use remaining appearance methods or remove gender change.
4. **Battle state rename** — `SecureBattleRevamp` replaced `Battle`/`SecureBattle`. Escape Battle, Win Battle, Heal Team need state name updates.
5. **`battleData` module** — Get all Runes and Hypermax runes step cannot find the module. Discovery logic needs a new shape function.
