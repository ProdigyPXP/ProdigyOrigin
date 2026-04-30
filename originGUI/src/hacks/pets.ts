// Pet Hacks


// BEGIN IMPORTS
import { Swal, Toast, NumberInput, Confirm } from "../utils/swal";  // Import Swal, Toast, Confirm, Input, and NumberInput from swal
import { category } from "../index";  // Import the mod menu bases.
import Hack from "../class/Hack";
import { _, VERY_LARGE_NUMBER, player } from "../utils/util";  // Import Prodigy typings and VERY_LARGE_NUMBER
import { getPet, obtainAllPets } from "../utils/hackify"; // Import getPet
// END IMPORTS


// BEGIN PET HACKS


// Begin Get All Pets
new Hack(category.pets, "Get All Pets").setClick(async () => {


    if (!(await Confirm.fire("Would you like to add all pets to your pets?")).value) {
        return console.log("Cancelled");
    }


    obtainAllPets();

    return Toast.fire("Success!", "All pets have been added!", "success");
});
// End Get All Pets




// Begin Get ALl Legacy Epics
new Hack(category.pets, "Get All Legacy Epics").setClick(async () => {


    if (!(await Confirm.fire({
        title: "This may damage your account.",
        html: "Attempting to add legacy epics may damage your account.<br><br><b>Warning:</b> this does <b>NOT</b> save on reload — the pets will disappear after refreshing.<br><br>Would you still like to add all legacy epics to your team?",
        icon: "warning"
    })).value) {
        return console.log("Cancelled");
    }

    // @ts-expect-error
    const epics = _.gameData.pet.filter(x => [125, 126, 127, 128, 129, 130, 131, 132, 133].includes(x.ID));
    // @ts-expect-error
    epics.forEach(x => {
        player.kennel.addPet(x.ID, VERY_LARGE_NUMBER, 26376, 100);
    });
    // Fix broken pets
    // @ts-expect-error
    player.kennel.petTeam.forEach(v => {
        if (v && (v as any).assignRandomSpells)(v as any).assignRandomSpells();
    });
    return Toast.fire("Success!", "All legacy epics have been added!", "success");
});
// End Get ALl Legacy Epics





// Begin Get All Mythical Epics
new Hack(category.pets, "Get All Mythical Epics").setClick(async () => {

    if (!(await Confirm.fire({
        title: "Add all mythical epics?",
        html: "<b>Warning:</b> this does <b>NOT</b> save on reload — the pets will disappear after refreshing.<br><br>Would you like to add all mythical epics to your pets?",
        icon: "warning"
    })).value) {
        return console.log("Cancelled");
    }


    // @ts-expect-error
	const epics = _.gameData.pet.filter(x => [
        158, // Magmayhem
        164, // Blast Star
        165, // Vegabloom
        166, // Arcturion
        167, // Aquadile
        168, // Shiver & Scorch
        169, // Riptide
        170, // Lumanight
        171, // Nebula
        189, // B.F. Magmayhem
    ].includes(x.ID));
    // @ts-expect-error
	epics.forEach(x => {
		player.kennel.addPet(x.ID, VERY_LARGE_NUMBER, 26376, 100);
	});
	// Fix broken pets
	player.kennel.petTeam.forEach((v: any) => {
		if (v && (v as any).assignRandomSpells) (v as any).assignRandomSpells();
	});
	return Toast.fire("Success!", "All mythical epics have been added!", "success");
}); // btw this hack was made by gemsvidø (alexey-max-fedorov on github)
// End Get ALl Mythical Epics





// Begin Clear Pets
new Hack(category.pets, "Clear Pets").setClick(async () => {

    if (!(await Confirm.fire("Would you like to delete all of your pets?")).value) {
        return console.log("Cancelled");
    }


    player.kennel.data.length = 0;

    return Toast.fire("Success!", "Your pets have been cleared!", "success");
});
// End Clear Pets





// Begin Add Pet
new Hack(category.pets, "Add Pet", "Adds a pet from a list.").setClick(async () => {
    // @ts-expect-error
    const pet = await Swal.fire({
        input: "select",
        // @ts-expect-error
        inputOptions: new Map(_.gameData.pet.map(x => [x.ID.toString(), `${x.ID}: ${x.data.name}`])),
        title: "Choose Pet",
        text: "Which pet do you want to obtain?"
    });
    if (pet.value === undefined) return;
    player.kennel.addPet(pet.value);
    // add encounter data
    player.kennel._encounterInfo._data.pets.push({
        firstSeenDate: Date.now(),
        ID: pet.value,
        timesBattled: 1,
        timesRescued: 1
    });

    return Toast.fire("Success!", "Your chosen pet has been added to your pets!", "success");
});
// End Add Pet





// Begin Uncap pet level
new Hack(category.pets, "Uncap pet level [Client Side]", "Change your pet's level to anything, even over 100. This hack won't save when you reload Prodigy.").setClick(async () => {
    const petTeam = player.kennel.petTeam.slice(0);
    petTeam.shift();
    // @ts-expect-error
    const names = petTeam.map(pet => pet.getName());
    const pet = await Swal.fire({
        title: "Which pet would you like to edit?",
        input: "select",
        inputOptions: names,
        inputPlaceholder: "Select...",
        inputValidator: res => res ? "" : "Please select which you'd like to obtain.",
        showCancelButton: true
    });
    const amt = await NumberInput.fire("Level", "What would you like to set your pet's level to? (Can be set over 100)", "question");
    if (!amt.value) return;
    const num = amt.value;
    // sorry in advance
    eval(`player.kennel.petTeam[parseInt(${pet.value})+1].getLevel = () => {return ${num}}`);
    return Toast.fire("Updated!", "The level of your pet was successfully updated. Note: this hack is client-side.", "success");
});
// End Uncap pet level





// Begin Delete Pet
new Hack(category.pets, "Delete Pet", "Delete a pet.").setClick(async () => {
    const pet = await getPet("Which pet do you wish to delete?");
    if (pet === undefined) return;
    player.kennel.data.splice(pet, 1);
    return Toast.fire("Successfully deleted!", "The selected pet was deleted successfully.", "success");
});
// End Delete Pet




// Begin All Pets Level 150
new Hack(category.pets, "All Pets Level 150", "Replaces all pets with every pet at level 150. WARNING: Erases current pet data.").setClick(async () => {
    if (!(await Confirm.fire("Are you sure?", "This will erase all your current pet data and replace it with every pet at level 150.")).value) return;

    try {
        const randomIntFromInterval = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

        const getHpFromPet = (level: number, petGameData: any) => {
            const statValue = petGameData.data.statHealth;
            const level1Hp = (500 / 1.25) * Math.pow(Math.pow(1.25, 0.25), statValue - 1);
            const hpInc = (100 / 1.25) * Math.pow(Math.pow(1.25, 0.25), statValue - 1);
            return Math.ceil(level1Hp + (level - 1) * hpInc);
        };

        const getXP = (level: number) => {
            if (level === 1) return 0;
            if (level === 2) return 10;
            const offsetLevel = level - 2;
            const xpConstant = 1.042;
            return Math.round((((1 - Math.pow(xpConstant, offsetLevel)) / (1 - xpConstant)) * 20) + 10);
        };

        const level = 150;
        const xp = getXP(level);
        // @ts-expect-error
        const pets = _.gameData.pet;

        player.kennel.data.length = 0;

        pets.forEach((pet: any) => {
            player.kennel.addPet(pet.ID, getHpFromPet(level, pet), xp, level);
        });

        player.kennel._encounterInfo._data.pets = pets.map((pet: any) => ({
            firstSeenDate: Date.now() - randomIntFromInterval(20000, 120000),
            ID: pet.ID,
            timesBattled: 1,
            timesRescued: 1,
            rescueAttempts: 1,
        }));

        // Fix broken pets
        // @ts-expect-error
        player.kennel.petTeam.forEach(v => {
            if (v && (v as any).assignRandomSpells) (v as any).assignRandomSpells();
        });

        return Swal.fire("Done!", "All pets added at level 150. Leave the game open for ~2 minutes to fully sync.", "success");
    } catch (e) {
        return Swal.fire("Error", "Failed to add pets: " + e, "error");
    }
});
// End All Pets Level 150


// END PET HACKS
