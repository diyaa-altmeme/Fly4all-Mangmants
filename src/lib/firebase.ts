
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCtlF3onBhtwg0Hh3iOOEjygi9mj81wxrA",
  authDomain: "fly4all-78277122-3cbd0.firebaseapp.com",
  projectId: "fly4all-78277122-3cbd0",
  storageBucket: "fly4all-78277122-3cbd0.firebasestorage.app",
  messagingSenderId: "108505683067",
  appId: "1:108505683067:web:3ab7755349630154e77ede"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rtdb: Database;

if (getApps().length) {
    app = getApps()[0];
} else {
    app = initializeApp(firebaseConfig);
}

auth = getAuth(app);
db = getFirestore(app);
rtdb = getDatabase(app);

export { app, db, auth, rtdb };
