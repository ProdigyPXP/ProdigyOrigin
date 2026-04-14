import { wrapper } from "../index";

const FPSc = document.createElement("button"); // Create menu toggler
var enabled : boolean = false;
let fpsInterval: ReturnType<typeof setInterval> | null = null;


export function startFps () : void {
    if (fpsInterval) return;
    enabled = true;
    activate();
}

export function stopFps () : void {
    enabled = false;
    if (fpsInterval) {
        clearInterval(fpsInterval);
        fpsInterval = null;
    }
    document.getElementById("fps-counter")?.remove();
}


function activate () : void {

    FPSc.id = "fps-counter";
    wrapper?.prepend(FPSc);


    fpsInterval = setInterval(() => {

        const fps : number = _.player.game.fps._framerate;

        if (enabled) {
            FPSc.innerText = fps.toFixed(2) + " FPS";
        } else {
            FPSc.remove();
            return;
        }
    }, 300);
}