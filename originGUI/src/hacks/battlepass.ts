// Battle Pass Hacks

// BEGIN IMPORTS
import { Swal, Toast } from "../utils/swal";
import { category } from "../index";
import Hack from "../class/Hack";
import { _ } from "../utils/util";
// END IMPORTS


function getBattlePass (): any {
    const prodigy = (_ as any)?.prodigy ?? (_ as any)?.instance?.prodigy;
    return prodigy?._currentBattlePass ?? prodigy?._battlePass ?? null;
}


// Begin Treasure Free
new Hack(category.battlepass, "Treasure Free", "Unlocks all free Battle Pass tier rewards.").setClick(async () => {
    const battlePass = getBattlePass();
    if (!battlePass || typeof battlePass !== "object") {
        return Swal.fire("Error", "Battle Pass not found.", "error");
    }
    const tiers = battlePass._tiers;
    if (!tiers || typeof tiers !== "object") {
        return Swal.fire("Error", "Tiers not found in battle pass.", "error");
    }
    Object.values(tiers).forEach((tier: any) => {
        if (!tier) return;
        tier.isCompleted = true;
        if (tier.freeReward) {
            tier.freeReward.claimed = false;
            tier.freeReward.claimable = true;
        }
    });
    return Toast.fire("Success!", "Free tier rewards unlocked.", "success");
});
// End Treasure Free


// Begin Treasure Core
new Hack(category.battlepass, "Treasure Core", "Unlocks all Core (bottom premium) Battle Pass tier rewards.").setClick(async () => {
    const battlePass = getBattlePass();
    if (!battlePass || typeof battlePass !== "object") {
        return Swal.fire("Error", "Battle Pass not found.", "error");
    }
    const tiers = battlePass._tiers;
    if (!tiers || typeof tiers !== "object") {
        return Swal.fire("Error", "Tiers not found in battle pass.", "error");
    }
    Object.values(tiers).forEach((tier: any) => {
        if (!tier) return;
        tier.isCompleted = true;
        if (tier.bottomPremiumReward) {
            tier.bottomPremiumReward.claimed = false;
            tier.bottomPremiumReward.claimable = true;
        }
    });
    return Toast.fire("Success!", "Core tier rewards unlocked.", "success");
});
// End Treasure Core


// Begin Treasure Plus
new Hack(category.battlepass, "Treasure Plus", "Unlocks all Plus (top premium) Battle Pass tier rewards.").setClick(async () => {
    const battlePass = getBattlePass();
    if (!battlePass || typeof battlePass !== "object") {
        return Swal.fire("Error", "Battle Pass not found.", "error");
    }
    const tiers = battlePass._tiers;
    if (!tiers || typeof tiers !== "object") {
        return Swal.fire("Error", "Tiers not found in battle pass.", "error");
    }
    Object.values(tiers).forEach((tier: any) => {
        if (!tier) return;
        tier.isCompleted = true;
        if (tier.topPremiumReward) {
            tier.topPremiumReward.claimed = false;
            tier.topPremiumReward.claimable = true;
        }
    });
    return Toast.fire("Success!", "Plus tier rewards unlocked.", "success");
});
// End Treasure Plus
