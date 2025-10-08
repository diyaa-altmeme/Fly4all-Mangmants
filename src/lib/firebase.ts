
// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFirebaseConfig } from "./firebase-client-config";


const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = !getApps().length && firebaseConfig ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
