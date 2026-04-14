// Minigame Hacks

// BEGIN IMPORTS
import { category } from "../index"; // Import the mod menu bases.
import Toggler from "../class/Toggler";
import { _ } from "../utils/util";  // Import Prodigy Typings.
import { Toast, Swal } from "../utils/swal"; // Import Toast and NumberInput from swal
import Hack from "../class/Hack";
// END IMPORTS


// BEGIN MINIGAME HACKS



// Begin 69x Walk Speed
new Toggler(category.minigames, "69x Walk Speed [Dyno Dig]", "Walk so fast that you're teleporting, in Dyno Dig.").setEnabled(async () => {
    _.instance.game.state.states.get("DinoDig").walkSpeed = 69;
    return Toast.fire("Enabled!", "You will now walk so fast that you're teleporting in Dyno Dig.", "success");

}).setDisabled(async () => {
    _.instance.game.state.states.get("DinoDig").walkSpeed = 1.5;
    return Toast.fire("Disabled!", "You will now walk at normal speed, in Dyno Dig.", "success");
});
// End 69x Walk Speed



// Begin Dino Dig +100 Days
new Hack(category.minigames, "Dino Dig +100 Days", "Adds 100 days to the active Dino Dig timer.").setClick(async () => {
    const dinoState = _.instance.game.state.states.get("DinoDig");
    if (!dinoState?.timer?.addTime) {
        return Swal.fire("Error", "You are not currently in Dino Dig.", "error");
    }
    dinoState.timer.addTime(8.64e9);
    return Toast.fire("Done!", "Added 100 days to the Dino Dig timer.", "success");
});
// End Dino Dig +100 Days


// Begin End Dino Dig
new Hack(category.minigames, "End Dino Dig", "Instantly ends the current Dino Dig session.").setClick(async () => {
    const dinoState = _.instance.game.state.states.get("DinoDig");
    if (!dinoState?.timer?.addTime) {
        return Swal.fire("Error", "You are not currently in Dino Dig.", "error");
    }
    dinoState.timer.addTime(-9e15);
    return Toast.fire("Done!", "Dino Dig session ended.", "success");
});
// End End Dino Dig


// END MINIGAME HACKS
