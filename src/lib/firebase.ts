import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtlF3onBhtwg0Hh3iOOEjygi9mj81wxrA",
  authDomain: "fly4all-78277122-3cbd0.firebaseapp.com",
  projectId: "fly4all-78277122-3cbd0",
  storageBucket: "fly4all-78277122-3cbd0.appspot.com",
  messagingSenderId: "108505683067",
  appId: "1:108505683067:web:3ab7755349630154e77ede"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
