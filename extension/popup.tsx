import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Save, RotateCcw, Play, MessageCircle } from "lucide-react";
import { Button } from "./components/Button";
import logoUrl from "data-base64:./assets/icon.png";
import "./style.css";

function Popup() {
  const [gameUrl, setGameUrl] = useState("");
  const [guiUrl, setGuiUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["originGameUrl", "originGuiUrl"], (res) => {
      setGameUrl(res.originGameUrl ?? "");
      setGuiUrl(res.originGuiUrl ?? "");
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set(
      { originGameUrl: gameUrl, originGuiUrl: guiUrl },
      () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    );
  };

  const handleReset = () => {
    chrome.storage.local.remove(["originGameUrl", "originGuiUrl"], () => {
      setGameUrl("");
      setGuiUrl("");
    });
  };

  return (
    <div className="popup-root">
      <div className="popup-header">
        <img src={logoUrl} alt="Prodigy Origin" className="popup-logo" />
        <div>
          <h1 className="popup-title">Prodigy Origin</h1>
          <p className="popup-eyebrow">Mod Loader · v4.1.0</p>
        </div>
      </div>

      <div className="divider-gold" />

      <div>
        <label className="field">
          <span className="field-label">Patched game.min.js URL</span>
          <input
            type="text"
            value={gameUrl}
            onChange={(e) => setGameUrl(e.target.value)}
            placeholder="default: P-NP/master/dist"
            className="field-input"
          />
        </label>

        <label className="field">
          <span className="field-label">Mod bundle URL</span>
          <input
            type="text"
            value={guiUrl}
            onChange={(e) => setGuiUrl(e.target.value)}
            placeholder="default: baked into patched game"
            className="field-input"
          />
        </label>
      </div>

      <div className="button-row">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          className="btn-flex"
        >
          <Save size={14} />
          <AnimatePresence mode="wait" initial={false}>
            {saved ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
              >
                Saved!
              </motion.span>
            ) : (
              <motion.span key="save">Save</motion.span>
            )}
          </AnimatePresence>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw size={14} />
          Reset
        </Button>
      </div>

      <p className="helper">
        Leave blank to use defaults. Reload the Prodigy tab after saving.
      </p>

      <div className="divider-subtle" />

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
