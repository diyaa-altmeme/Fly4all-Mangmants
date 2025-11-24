
'use server';

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let app: App;

function initializeFirebaseAdmin() {
    if (!getApps().length) {
        try {
            const serviceAccountString = process.env.FIREBASE_ADMIN_KEY;
            if (!serviceAccountString) {
                console.error("FIREBASE_ADMIN_KEY environment variable is not set.");
                return;
            }
            
            const serviceAccount = JSON.parse(serviceAccountString);

            app = initializeApp({
                credential: cert(serviceAccount),
            });
        } catch (e: any) {
            console.error("Firebase Admin SDK Initialization Error:", e.stack);
        }
    } else {
        app = getApps()[0]!;
    }
}

export async function getDb(): Promise<Firestore> {
  initializeFirebaseAdmin();
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized. Check server logs for details.");
  }
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  initializeFirebaseAdmin();
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized. Check server logs for details.");
  }
  return getAuth(app);
}

export async function getStorageAdmin() {
    initializeFirebaseAdmin();
    if (!app) {
        throw new Error("Firebase Admin SDK is not initialized. Check server logs for details.");
    }
    return getStorage(app);
}
