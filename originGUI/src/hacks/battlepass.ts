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


function unlockBattlePassRewards (rewardKey: string): ReturnType<typeof Toast.fire> | ReturnType<typeof Swal.fire> {
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
        if (tier[rewardKey]) {
            tier[rewardKey].claimed = false;
            tier[rewardKey].claimable = true;
        }
    });
    return Toast.fire("Success!", "Rewards unlocked.", "success");
}


// Begin Treasure Free
new Hack(category.battlepass, "Treasure Free", "Unlocks all free Battle Pass tier rewards.").setClick(async () => unlockBattlePassRewards("freeReward"));
// End Treasure Free


// Begin Treasure Core
new Hack(category.battlepass, "Treasure Core", "Unlocks all Core (bottom premium) Battle Pass tier rewards.").setClick(async () => unlockBattlePassRewards("bottomPremiumReward"));
// End Treasure Core


// Begin Treasure Plus
new Hack(category.battlepass, "Treasure Plus", "Unlocks all Plus (top premium) Battle Pass tier rewards.").setClick(async () => unlockBattlePassRewards("topPremiumReward"));
// End Treasure Plus
