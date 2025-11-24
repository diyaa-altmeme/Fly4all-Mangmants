// Bridge file to maintain compatibility with older imports.
// This file now contains the definitive initialization logic for Firebase Admin.
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let app: App;

if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || "{}");
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e: any) {
    console.error("Firebase Admin SDK Initialization Error:", e.stack);
    throw new Error("Failed to parse FIREBASE_ADMIN_KEY. Make sure it is set correctly in your environment variables.");
  }
} else {
  app = getApps()[0]!;
}

const authAdmin = getAuth(app);
const dbAdmin = getFirestore(app);
const storageAdmin = getStorage(app);

// Re-exporting the functions from the main SDK file for consistency
export { authAdmin, dbAdmin as getDb, getAuthAdmin, getStorageAdmin };
export * from "./firebase/firebase-admin-sdk";
