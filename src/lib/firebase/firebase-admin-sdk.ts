'use server';

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Since firebase-admin.ts is now the primary initializer, this file can be simplified
// to just export the functions that get the services.

let _app: App | undefined;

function getAdminApp(): App {
    if (_app) {
        return _app;
    }

    if (getApps().length > 0) {
        _app = getApps()[0]!;
        return _app;
    }
    
    // Fallback initialization if it hasn't happened for some reason.
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || "{}");
         if (!serviceAccount.project_id) {
            throw new Error('FIREBASE_ADMIN_KEY is not set or is invalid.');
        }
        _app = initializeApp({
            credential: cert(serviceAccount),
        });
        return _app;

    } catch(e: any) {
         console.error("Fallback Firebase Admin SDK Initialization Error:", e.stack);
         throw new Error("Failed to initialize Firebase Admin SDK. Check server logs and environment variables.");
    }
}

export async function getDb(): Promise<Firestore> {
  const app = getAdminApp();
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  const app = getAdminApp();
  return getAuth(app);
}

export async function getStorageAdmin() {
    const app = getAdminApp();
    return getStorage(app);
}
