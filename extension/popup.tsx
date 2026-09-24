import { VERSION } from "./lib/version";
import { ExternalLink, Play, MessageCircle } from "lucide-react";
import { Button } from "./components/Button";
import logoUrl from "data-base64:./assets/icon.png";
import "./style.css";

function Popup() {
  return (
    <div className="popup-root">
      <div className="popup-header">
        <img src={logoUrl} alt="Play Origin" className="popup-logo" />
        <div>
          <h1 className="popup-title">Play Origin</h1>
          <p className="popup-eyebrow">Mod Loader · v{VERSION}</p>
        </div>
      </div>

      <div className="divider-gold" />

      <p className="main-hint">To use the mods, just open Prodigy.</p>

      <div className="action-stack">
        <Button
          variant="primary"
          size="md"
          onClick={() =>
            chrome.tabs.create({ url: "https://play.prodigygame.com" })
          }
        >
          <Play size={14} />
          Open Prodigy
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={() => chrome.tabs.create({ url: "https://dsc.gg/ProdigyPXP" })}
        >
          <MessageCircle size={14} />
          Join Discord
          <ExternalLink size={12} style={{ opacity: 0.6 }} />
        </Button>
      </div>
    </div>
  );
}

export default Popup;
