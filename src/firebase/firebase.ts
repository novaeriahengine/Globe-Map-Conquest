import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  signInAnonymously,
  signInWithPopup,
  signOut
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD9MSET8eTdoeQHsOd_95AZ6Is69aCKAgo",
  authDomain: "globe-map-conquest.firebaseapp.com",
  projectId: "globe-map-conquest",
  storageBucket: "globe-map-conquest.firebasestorage.app",
  messagingSenderId: "703032791236",
  appId: "1:703032791236:web:06c65af1134c01778bf991",
  measurementId: "G-B16WXTZ7T8"
};

export const firebaseApp =
  getApps()[0] ?? initializeApp(firebaseConfig);

export const firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const firebaseAuth = getAuth(firebaseApp);

export async function ensureFirebaseSession() {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  const credential = await signInAnonymously(firebaseAuth);
  return credential.user;
}

export async function signInWithGoogleAccount() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const current = firebaseAuth.currentUser;
  if (current?.isAnonymous) {
    try {
      const linked = await linkWithPopup(current, provider);
      return linked.user;
    } catch (error: any) {
      const code = String(error?.code ?? "");
      if (
        !code.includes("credential-already-in-use") &&
        !code.includes("email-already-in-use") &&
        !code.includes("provider-already-linked")
      ) {
        throw error;
      }
    }
  }

  const credential = await signInWithPopup(firebaseAuth, provider);
  return credential.user;
}

export async function signOutToGuest() {
  await signOut(firebaseAuth);
  return ensureFirebaseSession();
}
