// Battle Hacks



// BEGIN IMPORTS
import { Toast, NumberInput } from "../utils/swal"; // Import Toast and NumberInput from swal
import { category } from "../index"; // Import the mod menu bases.
import Toggler from "../class/Toggler";
import Hack from "../class/Hack";
import { game, VERY_LARGE_NUMBER, player } from "../utils/util"; // Import prodigy typings
// END IMPORTS



// BEGIN BATTLE HACKS









// Begin Instant Kill
new Toggler(category.battle, "Instant Kill [PvE]", "Makes your spells do insane damage in PvE!").setEnabled(async () => {
    player.modifiers.damage = VERY_LARGE_NUMBER;
    return Toast.fire("Enabled!", "You will now do insane damage in PvE!", "success");

}).setDisabled(() => {
    player.modifiers.damage = 1;
    return Toast.fire("Disabled!", "You will no longer do insane damage in PvE!", "success");
});
// End Instant Kill






// Begin PvP Health
new Hack(category.battle, "PvP Health [PvP]", "Increases your HP in PvP by a hell ton.").setClick(async () => {
    player.pvpHP = VERY_LARGE_NUMBER;
    player.getMaxHearts = () => VERY_LARGE_NUMBER;
    return Toast.fire("Success!", "You now have lots of health!", "success");
});
// End PvP Health

















// Begin Set Battle Hearts
new Hack(category.battle, "Set Battle Hearts [PvP, PvE]", "Sets your hearts in battle, automatically raise your max hearts in PvP or PvE.").setClick(async () => {
    const hp = await NumberInput.fire("Health Amount", "How much HP do you want?", "question");
    if (hp.value === undefined) return;
    player.getMaxHearts = () => +hp.value;
    player.pvpHP = +hp.value;
    player.data.hp = +hp.value;
    return Toast.fire("Success!", "Your hearts have been set.", "success");
});
// End Set Battle Hearts





// Begin Fill Battle Energy
new Hack(category.battle, "Fill Battle Energy [PvP, PvE]", "Fills up your battle energy, if you are in PvP or PvE.").setClick(async () => {
    const state = game.state.getCurrentState();
    if (!("teams" in state)) return Toast.fire("Error", "You are currently not in a battle.", "error");
    state.teams[0].setEnergy(99);
    return Toast.fire("Success!", "Your battle energy has been filled.", "success");
});
// End Fill Battle Energy











// END BATTLE HACKS
