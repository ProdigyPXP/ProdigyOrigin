# ProdigyOrigin Security & Cleanup Handoff

Generated from security + simplification audit (2026-04-30). Execute in a fresh session.

---

## DO NOT TOUCH (by design or explicit decision)

| Location | Reason |
|---|---|
| `originGUI/src/hacks/utility.ts:113-121` | "Update menu" eval is a feature, not a bug |
| `extension/background.ts:20-42` | Broad CSP strip is intentional |
| `originGUI/src/utils/status.ts:10-23` | Remote status HTML fetch is accepted risk |
| `extension/firefox/contents/prodigy.ts:227-244` | Firefox document.write injector, do not port |
| `extension/firefox/` vs `extension/` divergence | Intentional, Firefox needs its own strategy |
| `extension/popup.tsx` + `extension/firefox/popup.tsx` duplication | Intentional, do not consolidate |
| `extension/components/Button.tsx` duplication | Same as above |

---

## FIXES TO IMPLEMENT

### 1. User-facing warning — "Switch Branch" mod
**File:** `originGUI/src/hacks/beta.ts:22-41`
**Action:** Add a clear user-facing warning before any branch is loaded. Do NOT remove the feature.
The warning should make clear that loading a non-master branch executes untrusted JS in the user's Prodigy session.

---

### 2. Developer-options challenge — Custom URL fields
**File:** `extension/popup.tsx` (and `extension/firefox/popup.tsx`)
**Action:** The popup already has a developer-only warning. Add an input challenge gate in front of the URL fields. Before the user can type in the custom game/GUI URL inputs, they must answer:

> "How is `i` usually incremented in for loops?"

Accept any of: `i++` / `i++;` / `i += 1` / `i += 1;` (trim whitespace, case-insensitive is fine since it's code).
Only reveal/enable the URL inputs after a correct answer. This is a friction gate, not real security — keep it lightweight.

---

### 3. Dev bundle guard
**File:** `originGUI/src/index.ts:168-179` + `originGUI/hot-reload.mjs` + `CLAUDE.md`

**Action (hot-reload.mjs):** When writing `dist/bundle.js` during dev/watch mode, append the comment `/* DEV BUNDLE */` to the end of the file.

**Action (CLAUDE.md):** Add a rule under the Critical Rules section:

> Before committing or pushing `originGUI/dist/bundle.js`, check that the file does NOT end with `/* DEV BUNDLE */`. If it does, stop — run `cd originGUI && pnpm build` to rebuild the production bundle before proceeding. Warn the user.

---

### 4. Centralize duplicated Max Account logic
**Files:**
- `originGUI/src/hacks/player.ts:25-205` (Max Account)
- `originGUI/src/hacks/beta.ts:144-440` (Hypermax Account)
- `originGUI/src/hacks/pets.ts:25-48`
- `originGUI/src/hacks/inventory.ts:26-28`, `:82-84`

**Action:** Extract shared helpers into `originGUI/src/utils/hackify.ts`:
- `obtainAllPets()` — the get-all-pets + assignRandomSpells block (duplicated in player.ts, beta.ts, pets.ts)
- `obtainAllItems(amount)` — the `itemify(_.gameData[id]…filter(…blacklist))` block (duplicated in player.ts, beta.ts, inventory.ts x2)
- `removeBountyNotes()` — if duplicated

The follow-pet ID blacklist `[125, 126, 127, 128, 129, 134, 135, 136, 137]` is currently duplicated in 4 places — centralize it as a named constant in `hackify.ts`.

Update all call sites to use the extracted helpers.

---

### 5. Battlepass triplicate — collapse to helper
**File:** `originGUI/src/hacks/battlepass.ts:17-83`

**Action:** `Treasure Free`, `Treasure Core`, `Treasure Plus` differ only by reward key (`freeReward` / `bottomPremiumReward` / `topPremiumReward`). Collapse to one function `unlockBattlePassRewards(rewardKey: string)` and three one-liner call sites.

---

### 6. Keyboard Mode — keep keybinds, note for later
**File:** `originGUI/src/utils/keybinds.ts:57-73`

**Action:** Keep the commented-out keybinds block as-is. Add a `// TODO` comment above it:

```ts
// TODO: Test this and expose as a "Keyboard Mode" mod (WASD + hotkey config in the menu)
```

No other changes to this file.

---

### 7. Remove unused exports and imports
**Files:** `originGUI/src/utils/util.ts` and any other files with unused exports/imports.

Known specific items:
- `util.ts` — `states` (exported, never imported elsewhere), `pickRandom` (exported, never imported)
- Check all files for unused imports via TypeScript errors or grep

**Action:** Delete unused exports and their imports across the codebase. Do not remove anything that is actually used.

---

### 8. Delete typings/test.ts
**File:** `typings/test.ts`

**Action:** Delete the file. It is empty (0 bytes).

---

### 9. Double-check Hack.ts unused description field
**File:** `originGUI/src/class/Hack.ts:9`

**Action:** Read the file carefully. Verify whether `private description: String` is actually unused and that `setDesc` is never called or the result never read. If confirmed unused:
- Remove the field
- Remove the `// @ts-expect-error` suppressor
- Change any remaining `String` (capital S, boxed wrapper) to `string`

If it turns out to be used somewhere, leave it but fix the capital `S` to lowercase `s`.

---

### 10. Fix: misc.ts arrow function returns undefined
**File:** `originGUI/src/hacks/misc.ts:60`

**Action:** Change `(() => { true; })` to `() => true`.

---

### 11. Fix: Math.min(99, 100) is just 99
**Files:**
- `originGUI/src/hacks/player.ts:67`
- `originGUI/src/hacks/beta.ts:189`

**Action:** Replace `Math.min(99, 100)` with `99` in both places.

---

### 12. Fix: -9223372036854775808 coerces to 0
**File:** `originGUI/src/hacks/beta.ts:200`

**Action:** Replace the literal `-9223372036854775808` with a value that actually represents "minimum losses" in JS — probably `0` (no losses), or `Number.MIN_SAFE_INTEGER` if the intent is "a very negative number". Confirm with surrounding context what the intent is, then fix it and remove the "ik its irrelevant" comment.

---

### 13. Remove leftover debug log
**File:** `originGUI/src/index.ts:187`

**Action:** Delete the line `console.log("yo");`.

---

## REFERENCE — items noted but explicitly left alone

- `originGUI/src/hacks/player.ts` split into sub-files — deferred, not urgent
- `class/Toggler.ts:29-37` `migrateOldKey` — one-shot legacy migration, leave until it's clearly safe to remove
- `hacks/misc.ts` over-defensive try/catch around Unlimited Spins — noted but low priority
- `typings/util.d.ts` (`export type TODO = any;`) — harmless one-liner, leave
- `lucide-react@^1.8.0` version oddity — investigate separately if icons look wrong
