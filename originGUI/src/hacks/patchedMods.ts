// Patched / Broken Mods Archive
//
// This file is intentionally inert — no mods here are registered to the menu.
// Code is preserved here for reference and future repair.
//
// Moved here because these mods are either:
//   ❌ Broken  — game update removed or renamed the APIs they depend on
//   🔒 Patched — server-side patch makes them non-functional
//
// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSES
// ─────────────────────────────────────────────────────────────────────────────
// 1. _.constants undefined — P-NP regex for `A.constants={"GameConstants...`
//    no longer matches the current game build.  Affects: Disable Math,
//    Skip Enemy Turn, Disable Monster Encounters, Disable Inactivity Kick.
//
// 2. prodigy.giftBoxController removed from prodigy object; not in
//    gameContainer either.  Affects: Obtain Conjure Cubes.
//
// 3. player.appearance.setGender() removed from game prototype.
//    Remaining methods: setEyeColor, setFace, setHair, setSkinColor.
//    Affects: Bobbify.
//
// 4. Battle states renamed — "Battle"/"SecureBattle" replaced by
//    "SecureBattleRevamp"; run-away/victory methods not found on new state.
//    Affects: Escape Battle, Win Battle, Heal Team.
//
// 5. battleData module not discoverable in gameContainer binding map.
//    Affects: Get all Runes.
//
// 6. prodigy.pvpNetworkHandler not present (server-side patch).
//    Affects: Arena Point Increaser.
//
// 7. prodigy.debugMisc.disableTimeoutDialogue not present (server-side patch).
//    Affects: Disable Timeout Dialog.
// ─────────────────────────────────────────────────────────────────────────────

/*

// ═══════════════════════════════════════════════════════════════════
// FROM player.ts — Obtain Conjure Cubes
// ❌ Broken: prodigy.giftBoxController is undefined
// ═══════════════════════════════════════════════════════════════════

new Hack(category.player, "Obtain Conjure Cubes").setClick(async () => {
    const cubes = await NumberInput.fire("Conjure Cubes", "How many conjure cubes do you want to get? (Max 99)", "question");
    if (cubes.value === undefined) return;
    for (let i = 0; i < Math.min(99, +cubes.value); i++) {
        prodigy.giftBoxController.receiveGiftBox(null, getItem("giftBox", 1));
    }
    return Toast.fire("Success!", `You have gained ${cubes.value} conjure cube${cubes.value != 1 ? "s" : ""}.`, "success");
});


// ═══════════════════════════════════════════════════════════════════
// FROM battle.ts — Disable Math [PvP, PvE]
// ❌ Broken: _.constants is undefined (P-NP constants regex mismatch)
// ═══════════════════════════════════════════════════════════════════

new Toggler(category.battle, "Disable math [PvP, PvE]", "Disable math in PvP, PvE, anywhere! This doesn't work in the Floatling town.").setEnabled(async () => {
    _.constants.constants["GameConstants.Debug.EDUCATION_ENABLED"] = false;
    return Toast.fire("Enabled!", "You will no longer do Math!", "success");
}).setDisabled(async () => {
    _.constants.constants["GameConstants.Debug.EDUCATION_ENABLED"] = true;
    return Toast.fire("Disabled!", "You will now do Math!", "success");
});


// ═══════════════════════════════════════════════════════════════════
// FROM battle.ts — Escape Battle [PvP, PvE]
// ❌ Broken: allowlist checks for "Battle"/"SecureBattle"; current state
//            is "SecureBattleRevamp" — falls through to "Invalid State"
// ═══════════════════════════════════════════════════════════════════

new Hack(category.battle, "Escape Battle [PvP, PvE]", "Escape any battle, PvP or PvE!").setClick(async () => {
    const currentState = game.state.current;
    if (currentState === "PVP") {
        Object.fromEntries(_.instance.game.state.states).PVP.endPVP();
        return Toast.fire("Escaped!", "You have successfully escaped from the PvP battle.", "success");
    } else if (currentState === "CoOp") {
        prodigy.world.$(player.data.zone);
        return Toast.fire("Escaped!", "You have successfully escaped from the battle.", "success");
    } else if (!["Battle", "SecureBattle"].includes(currentState)) {
        return Toast.fire("Invalid State.", "You are currently not in a battle.", "error");
    } else {
        Object.fromEntries(_.instance.game.state.states)[currentState].runAwayCallback();
        return Toast.fire("Escaped!", "You have successfully escaped from the PvE battle.", "success");
    }
});


// ═══════════════════════════════════════════════════════════════════
// FROM battle.ts — Win Battle [PvE]
// ❌ Broken: switch only handles "Battle"/"SecureBattle"; current state
//            is "SecureBattleRevamp" — hits default "not in a battle"
// ═══════════════════════════════════════════════════════════════════

new Hack(category.battle, "Win Battle [PvE]", "Instantly win a battle in PvE.").setClick(async () => {
    const currentState = game.state.current;
    console.log("Current State: " + currentState);
    switch (currentState) {
        case "PVP":
        case "CoOp":
            return Toast.fire("Invalid State.", "PvP is not supported for this hack.", "error");
        case "Battle":
            Object.fromEntries(_.instance.game.state.states).Battle.startVictory();
            return Toast.fire("Victory!", "You have successfully won the battle.", "success");
        case "SecureBattle":
            Object.fromEntries(_.instance.game.state.states).SecureBattle.battleVictory();
            return Toast.fire("Victory!", "You have successfully won the battle.", "success");
        default:
            return Toast.fire("Invalid State.", "You are currently not in a battle.", "error");
    }
});


// ═══════════════════════════════════════════════════════════════════
// FROM battle.ts — Skip Enemy Turn
// ❌ Broken: _.constants is undefined (P-NP constants regex mismatch)
// ═══════════════════════════════════════════════════════════════════

new Toggler(category.battle, "Skip enemy turn").setEnabled(async () => {
    _.constants.constants["GameConstants.Battle.SKIP_ENEMY_TURN"] = true;
    return Toast.fire("Skipping!", "Enemy turns will now be skipped.", "success");
}).setDisabled(async () => {
    _.constants.constants["GameConstants.Battle.SKIP_ENEMY_TURN"] = false;
    return Toast.fire("Disabled", "Enemy turns will no longer be skipped.", "success");
});


// ═══════════════════════════════════════════════════════════════════
// FROM battle.ts — Heal Team [PvE]
// ❌ Broken: state check requires "Battle"/"SecureBattle"; current state
//            is "SecureBattleRevamp" — returns "Invalid State"
// ═══════════════════════════════════════════════════════════════════

new Hack(category.battle, "Heal Team [PvE]", "Instantly heals you and your pets, if you are in PvE.").setClick(async () => {
    const currentState: string = game.state.current;
    if (currentState === "PVP" || currentState === "CoOp") {
        return Toast.fire("Invalid State.", "PvP is not supported for this hack.", "error");
    } else if (["Battle", "SecureBattle"].includes(currentState)) {
        player.heal();
        return Toast.fire("Success!", "Your team has been healed successfully!", "success");
    } else {
        return Toast.fire("Invalid State.", "Your are currently not in a battle.", "error");
    }
});


// ═══════════════════════════════════════════════════════════════════
// FROM misc.ts — Disable Monster Encounters
// ❌ Broken: _.constants is undefined (P-NP constants regex mismatch)
// ═══════════════════════════════════════════════════════════════════

new Toggler(category.misc, "Disable Monster Encounters").setEnabled(async () => {
    _.constants.constants["GameConstants.Debug.SCALE_ENCOUNTER_DISTANCE"] = 0;
    return Toast.fire("Enabled!", "Monsters will no longer battle you.", "success");
}).setDisabled(() => {
    _.constants.constants["GameConstants.Debug.SCALE_ENCOUNTER_DISTANCE"] = 1;
    return Toast.fire("Disabled!", "Monsters will now battle you.", "success");
});


// ═══════════════════════════════════════════════════════════════════
// FROM misc.ts — Bobbify
// ❌ Broken: player.appearance.setGender() removed from game prototype.
//            Crashes before any appearance changes are applied.
//            Remaining methods: setEyeColor, setFace, setHair, setSkinColor
// ═══════════════════════════════════════════════════════════════════

new Hack(category.misc, "Bobbify", "Converts your account into Bobby Fancywoman.").setClick(async () => {
    if (!(await Confirm.fire("Are you sure you want your account to be turned into Bobby Fancywoman?", "This action is not reversable.")).value) return;

    player.name.data.nickname = null;
    player.name.data.firstName = 44;
    player.name.data.middleName = 754;
    player.name.data.lastName = 882;
    player.data.stars = -1e22;
    player.data.level = 69;

    player.appearance.setGender("male");   // <-- crashes here; method removed
    player.appearance.setEyeColor(1);
    player.appearance.setFace(4);
    player.appearance.setHair(19, 1);
    player.appearance.setSkinColor(1);
    player.equipment.setFollow(19);
    player.equipment.setHat(19);
    player.equipment.setBoots(19);
    player.equipment.setOutfit(19);
    player.equipment.setWeapon(19);

    return Toast.fire("Bobbified!", "You are now Bobby Fancywoman.", "success");
});


// ═══════════════════════════════════════════════════════════════════
// FROM utility.ts — Disable Inactivity Kick
// ❌ Broken: _.constants is undefined (P-NP constants regex mismatch)
// ═══════════════════════════════════════════════════════════════════

new Hack(category.utility, "Disable inactivity kick", "Keeps you from being logged out for inactivity.").setClick(async () => {
    _.constants.constants["GameConstants.Inactivity.LOG_OUT_TIMER_SECONDS"] = 0;
    return Toast.fire("Success!", "You now will never be logged out!", "success");
});


// ═══════════════════════════════════════════════════════════════════
// FROM beta.ts — Get all Runes [BETA]
// ❌ Broken: battleData module not found in gameContainer binding map
// ═══════════════════════════════════════════════════════════════════

new Hack(category.beta, "Get all Runes [BETA]").setClick(async () => {
    if (!(await Confirm.fire({
            title: "Hang on!",
            html: "This hack may damage your account with various bugs, for example you may be unable to do Rune Run.<br><br>Proceed?",
            icon: "warning"
        })).value) {
        return;
    }

    const amount = parseInt((await NumberInput.fire({
        title: "Amount",
        text: "How many of each would you like?",
        icon: "question",
        inputValidator: (res: any) => res ? "" : "Please select which you'd like to get."
    })).value);
    if (isNaN(amount)) return;
    let mod;

    Array.from(_.instance.prodigy.gameContainer._inversifyContainer._bindingDictionary._map).forEach(e => {
        try {
            if (_.instance.prodigy.gameContainer.get(e[0]).battleData) {
                mod = e[0];
            }
        } catch {
            console.log(`Error for ${e[0]}`);
        }
    });

    _.instance.prodigy.gameContainer.get(mod).battleData._secureCharacterState._data.inventory.orb = runeify(_.gameData.orb, amount);
    return Toast.fire("Runes Added!", "Your runes have been added!", "success");
});


// ═══════════════════════════════════════════════════════════════════
// FROM patched.ts — Arena Point Increaser [Patched]
// 🔒 Patched: prodigy.pvpNetworkHandler not present; server rejects requests
// ═══════════════════════════════════════════════════════════════════

let arenaInterval: unknown | null = null;

new Hack(category.patched, "Arena Point Increaser [Patched]").setClick(async () => {
    if (arenaInterval) {
        return Swal.fire("Already Enabled", "Arena Point Increaser is already enabled.", "error");
    } else if (!(await Confirm.fire("This hack is patched.", "Running it will probably do nothing.")).value) {
        return console.log("Cancelled");
    } else {
        arenaInterval = setInterval(async () => {
            const data = await (
                await fetch(
                    `https://api.prodigygame.com/leaderboard-api/season/${prodigy.pvpNetworkHandler.seasonID}/user/${player.userID}/pvp?userID=${player.userID}`, {
                        headers: {
                            authorization: `Bearer ${prodigy.network.jwtAuthProvider.getToken()}`,
                            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                        },
                        body: `seasonID=${prodigy.pvpNetworkHandler.seasonID}&action=win`,
                        method: "POST",
                        mode: "cors",
                    }
                )
            ).text();
            if (data !== "") {
                const jsoned = JSON.parse(data);
                console.log(`[API] ${jsoned.points} Points (+100)`);
            } else console.log(`[API] Failed to add points.`);
        }, 60500);
        return Swal.fire("Enabled", "Arena Point Increaser has been enabled.", "success");
    }
});


// ═══════════════════════════════════════════════════════════════════
// FROM patched.ts — Disable Timeout Dialog [Patched]
// 🔒 Patched: prodigy.debugMisc.disableTimeoutDialogue not present
// ═══════════════════════════════════════════════════════════════════

new Hack(category.patched, "Disable Timeout Dialog [Patched]").setClick(async () => {
    if (!(await Confirm.fire("This hack is patched.", "Running it will probably do nothing.")).value) {
        return console.log("Cancelled");
    } else {
        prodigy.debugMisc.disableTimeoutDialogue();
    }
    return Toast.fire("Enabled", "Timeout Dialog has been disabled.", "success");
});

*/
