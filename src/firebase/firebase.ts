import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
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
