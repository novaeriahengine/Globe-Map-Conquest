import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe
} from "firebase/firestore";
import { DEFAULT_CATALOG } from "../data/catalogDefaults";
import type { NameCatalog, SavedWorld } from "../game/types";
import { ensureFirebaseSession, firestore } from "./firebase";

export interface CloudWorldSummary {
  id: string;
  name: string;
  mode: string;
  seed: number;
  tick: number;
  updatedAt: number | null;
}

function cleanWorldId(input: string) {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || "world";
}

export async function saveWorldToCloud(
  worldId: string,
  snapshot: SavedWorld
): Promise<string> {
  const user = await ensureFirebaseSession();
  const id = cleanWorldId(worldId);
  // Firestore rejects undefined values. Round-trip through JSON so the saved
  // document is a clean JSON-like snapshot and optional fields are omitted.
  const jsonSnapshot = JSON.parse(JSON.stringify(snapshot)) as SavedWorld;
  const worldRef = doc(firestore, "worlds", id);
  const stateRef = doc(firestore, "worlds", id, "state", "current");

  // Write the owned world metadata first so Firestore rules can authorize
  // writes to the nested state document against the parent owner UID.
  await setDoc(
    worldRef,
    {
      name: jsonSnapshot.worldName,
      mode: jsonSnapshot.worldMode,
      seed: jsonSnapshot.seed,
      tick: jsonSnapshot.tick,
      version: jsonSnapshot.version,
      ownerUid: user.uid,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  await setDoc(
    stateRef,
    {
      snapshot: jsonSnapshot,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return id;
}

export async function loadWorldFromCloud(
  worldId: string
): Promise<SavedWorld | null> {
  const id = cleanWorldId(worldId);
  const stateRef = doc(firestore, "worlds", id, "state", "current");
  const result = await getDoc(stateRef);
  if (!result.exists()) return null;
  return (result.data().snapshot ?? null) as SavedWorld | null;
}

export function subscribeToCloudWorld(
  worldId: string,
  onWorld: (snapshot: SavedWorld) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const id = cleanWorldId(worldId);
  const stateRef = doc(firestore, "worlds", id, "state", "current");

  return onSnapshot(
    stateRef,
    (result) => {
      if (!result.exists()) return;
      const snapshot = result.data().snapshot as SavedWorld | undefined;
      if (snapshot?.version === 2) onWorld(snapshot);
    },
    (error) => onError?.(error)
  );
}

export async function listCloudWorlds(): Promise<CloudWorldSummary[]> {
  const worldsRef = collection(firestore, "worlds");
  const results = await getDocs(query(worldsRef, orderBy("updatedAt", "desc"), limit(24)));

  return results.docs.map((item) => {
    const data = item.data();
    const millis =
      data.updatedAt && typeof data.updatedAt.toMillis === "function"
        ? data.updatedAt.toMillis()
        : null;

    return {
      id: item.id,
      name: String(data.name ?? item.id),
      mode: String(data.mode ?? "earth"),
      seed: Number(data.seed ?? 0),
      tick: Number(data.tick ?? 0),
      updatedAt: millis
    };
  });
}

export async function ensureDefaultCatalog(): Promise<NameCatalog> {
  const catalogRef = doc(firestore, "catalogs", "defaults");
  const result = await getDoc(catalogRef);

  if (result.exists()) {
    const data = result.data() as Partial<NameCatalog>;
    return {
      countryNames: data.countryNames ?? DEFAULT_CATALOG.countryNames,
      territoryNames: data.territoryNames ?? DEFAULT_CATALOG.territoryNames,
      allianceNames: data.allianceNames ?? DEFAULT_CATALOG.allianceNames,
      species: data.species ?? DEFAULT_CATALOG.species,
      npcFirstNames: data.npcFirstNames ?? DEFAULT_CATALOG.npcFirstNames,
      npcLastNames: data.npcLastNames ?? DEFAULT_CATALOG.npcLastNames,
      traitNames: data.traitNames ?? DEFAULT_CATALOG.traitNames
    };
  }

  await ensureFirebaseSession();
  await setDoc(catalogRef, {
    ...DEFAULT_CATALOG,
    updatedAt: serverTimestamp()
  });

  return DEFAULT_CATALOG;
}
