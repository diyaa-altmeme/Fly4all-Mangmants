
// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFirebaseConfig } from "./firebase-client-config";


const firebaseConfig = getFirebaseConfig() as FirebaseOptions;

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
