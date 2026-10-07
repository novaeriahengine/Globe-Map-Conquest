import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  deleteSaveSlot,
  listSaveSlots,
  loadSaveSlot,
  saveGameSlot,
  type SaveSlotSummary
} from "../firebase/worldCloud";
import {
  ensureFirebaseSession,
  firebaseAuth,
  signInWithGoogleAccount,
  signOutToGuest
} from "../firebase/firebase";
import { useGameStore } from "../store/useGameStore";

export function SaveLoadPanel() {
  const exportWorld = useGameStore((state) => state.exportWorld);
  const importWorld = useGameStore((state) => state.importWorld);
  const worldName = useGameStore((state) => state.worldName);
  const tick = useGameStore((state) => state.tick);

  const [user, setUser] = useState<User | null>(firebaseAuth.currentUser);
  const [slots, setSlots] = useState<SaveSlotSummary[]>([]);
  const [saveName, setSaveName] = useState("Checkpoint");
  const [status, setStatus] = useState("Ready");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      await ensureFirebaseSession();
      const next = await listSaveSlots();
      setSlots(next);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load saves");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      void refresh();
    });

    void ensureFirebaseSession().then(() => refresh());

    return unsubscribe;
  }, []);

  const save = async () => {
    setBusy(true);
    setStatus("Saving...");
    try {
      const name =
        saveName.trim() ||
        `${worldName} - Tick ${tick}`;
      await saveGameSlot(name, exportWorld());
      setStatus("Save created in Firestore");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const load = async (id: string) => {
    setBusy(true);
    setStatus("Loading...");
    try {
      const snapshot = await loadSaveSlot(id);
      if (!snapshot) {
        setStatus("Save not found");
        return;
      }
      importWorld(snapshot, "Loaded Firestore save slot.");
      setStatus("Save loaded");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Load failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this Firestore save?")) return;
    setBusy(true);
    try {
      await deleteSaveSlot(id);
      setStatus("Save deleted");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setBusy(true);
    setStatus("Signing in...");
    try {
      const nextUser = await signInWithGoogleAccount();
      setUser(nextUser);
      setStatus("Google account connected");
      await refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Make sure Google Auth is enabled in Firebase."
      );
    } finally {
      setBusy(false);
    }
  };

  const guestMode = async () => {
    setBusy(true);
    try {
      const nextUser = await signOutToGuest();
      setUser(nextUser);
      setStatus("Guest mode");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel save-load-panel">
      <div className="panel-title-row">
        <div>
          <div className="eyebrow">SAVE / LOAD</div>
          <strong>Firestore Saves</strong>
        </div>
        <span className={user?.isAnonymous ? "account-pill guest" : "account-pill"}>
          {user?.isAnonymous ? "Guest" : "Account"}
        </span>
      </div>

      <div className="save-account-row">
        <div>
          <strong>
            {user?.isAnonymous
              ? "Anonymous local account"
              : user?.email ?? user?.displayName ?? "Firebase account"}
          </strong>
          <small>
            {user?.isAnonymous
              ? "Saves stay with this browser. Connect Google for cross-device saves."
              : "Your save slots follow this Firebase account."}
          </small>
        </div>

        {user?.isAnonymous ? (
          <button
            className="button compact"
            disabled={busy}
            onClick={() => void googleSignIn()}
          >
            Sign in Google
          </button>
        ) : (
          <button
            className="button compact subtle"
            disabled={busy}
            onClick={() => void guestMode()}
          >
            Guest
          </button>
        )}
      </div>

      <div className="save-create-row">
        <input
          className="text-input"
          value={saveName}
          onChange={(event) => setSaveName(event.target.value)}
          placeholder="Save name"
        />
        <button
          className="button compact success"
          disabled={busy}
          onClick={() => void save()}
        >
          Save
        </button>
      </div>

      <div className="save-slot-list">
        {slots.length === 0 && (
          <div className="empty-state">
            No save slots yet. Save the current simulation to create one.
          </div>
        )}

        {slots.slice(0, 12).map((slot) => (
          <div className="save-slot" key={slot.id}>
            <button
              className="save-slot-main"
              disabled={busy}
              onClick={() => void load(slot.id)}
            >
              <strong>{slot.name}</strong>
              <span>
                {slot.worldName} · {slot.viewMode === "map2d" ? "2D" : "3D"} · tick {slot.tick}
              </span>
            </button>
            <button
              className="save-delete"
              disabled={busy}
              title="Delete save"
              onClick={() => void remove(slot.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="tiny-status">{status}</div>
    </section>
  );
}
