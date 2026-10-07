import { useEffect, useRef, useState } from "react";
import {
  ensureDefaultCatalog,
  loadWorldFromCloud,
  saveWorldToCloud
} from "../firebase/worldCloud";
import { useGameStore } from "../store/useGameStore";

export function CloudPanel() {
  const [worldId, setWorldId] = useState(
    () => localStorage.getItem("gmc-cloud-world-id") ?? "main-world"
  );
  const [autosave, setAutosave] = useState(
    () => localStorage.getItem("gmc-cloud-autosave") !== "off"
  );
  const [status, setStatus] = useState("Firebase ready");
  const timer = useRef<number | null>(null);

  const exportWorld = useGameStore((state) => state.exportWorld);
  const importWorld = useGameStore((state) => state.importWorld);
  const setCatalog = useGameStore((state) => state.setCatalog);

  useEffect(() => {
    ensureDefaultCatalog()
      .then((catalog) => setCatalog(catalog))
      .catch(() => setStatus("Catalog using built-in fallback"));
  }, [setCatalog]);

  useEffect(() => {
    localStorage.setItem("gmc-cloud-world-id", worldId);
  }, [worldId]);

  useEffect(() => {
    localStorage.setItem("gmc-cloud-autosave", autosave ? "on" : "off");
    if (!autosave) return;

    const unsubscribe = useGameStore.subscribe((state, previous) => {
      const changed =
        state.worldName !== previous.worldName ||
        state.worldMode !== previous.worldMode ||
        state.seed !== previous.seed ||
        state.objects !== previous.objects ||
        state.factions !== previous.factions ||
        state.territories !== previous.territories ||
        state.npcs !== previous.npcs ||
        state.quests !== previous.quests ||
        state.tick !== previous.tick;

      if (!changed) return;

      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setStatus("Saving…");
        saveWorldToCloud(worldId, useGameStore.getState().exportWorld())
          .then((id) => {
            setWorldId(id);
            setStatus("Saved to Firestore");
          })
          .catch((error) => {
            setStatus(error instanceof Error ? error.message : "Firestore save failed");
          });
      }, 1800);
    });

    return () => {
      unsubscribe();
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [autosave, worldId]);

  const saveNow = async () => {
    setStatus("Saving…");
    try {
      const id = await saveWorldToCloud(worldId, exportWorld());
      setWorldId(id);
      setStatus("Saved to Firestore");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Firestore save failed");
    }
  };

  const loadNow = async () => {
    setStatus("Loading…");
    try {
      const snapshot = await loadWorldFromCloud(worldId);
      if (!snapshot) {
        setStatus("No Firestore snapshot with that ID");
        return;
      }
      importWorld(snapshot, `Loaded Firestore world ${worldId}.`);
      setStatus("Loaded from Firestore");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Firestore load failed");
    }
  };

  return (
    <section className="panel cloud-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">FIRESTORE MEMORY</div>
          <strong>Cloud JSON World</strong>
        </div>
        <span className={autosave ? "cloud-dot active" : "cloud-dot"} />
      </div>

      <input
        className="text-input"
        value={worldId}
        onChange={(event) => setWorldId(event.target.value)}
        placeholder="world-id"
      />

      <div className="cloud-actions">
        <button className="button compact" onClick={() => void saveNow()}>
          Save Cloud
        </button>
        <button className="button compact" onClick={() => void loadNow()}>
          Load Cloud
        </button>
      </div>

      <label className="autosave-row">
        <input
          type="checkbox"
          checked={autosave}
          onChange={(event) => setAutosave(event.target.checked)}
        />
        <span>Autosave changes to Firestore</span>
      </label>

      <div className="tiny-status">{status}</div>
    </section>
  );
}
