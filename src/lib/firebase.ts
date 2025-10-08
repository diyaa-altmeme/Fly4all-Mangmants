// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFirebaseConfig } from "./firebase-client-config";

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = firebaseConfig ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// Throw an error if Firebase is not initialized, to fail early
if (!app || !auth || !db) {
    throw new Error("Firebase has not been initialized correctly. Please check your configuration.");
}

export { app, auth, db };
