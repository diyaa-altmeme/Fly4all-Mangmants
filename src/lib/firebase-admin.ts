
import * as admin from "firebase-admin";
import { serviceAccount } from "./firebase-service-account";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
  }
}

export const getDb = () => {
    if (!admin.apps.length) {
        console.error("Firebase Admin SDK not initialized. Call initializeApp first.");
        // Avoid throwing here to prevent crashing server on minor init race conditions
        // but return a proxy that will throw if any method is called.
        return new Proxy({}, {
            get(target, prop) {
                throw new Error("Firebase not initialized. Cannot access Firestore.");
            }
        }) as admin.firestore.Firestore;
    }
    return admin.firestore();
}

export const getAuthAdmin = () => {
     if (!admin.apps.length) {
        throw new Error("Firebase Admin SDK not initialized.");
    }
    return admin.auth();
}

export const getStorageAdmin = () => {
     if (!admin.apps.length) {
        throw new Error("Firebase Admin SDK not initialized.");
    }
    return admin.storage();
}

export const adminApp = admin;
