
'use server'

import { App, cert, getApp, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { serviceAccount } from './firebase-service-account';

// Holds the single initialized Firebase app instance.
let firebaseAdminApp: App | null = null;

async function getFirebaseAdminApp(): Promise<App> {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }

    // If an app is already initialized, use it.
    if (getApps().length > 0) {
        firebaseAdminApp = getApp();
        return firebaseAdminApp;
    }
    
    // Validate service account credentials from the imported object
    if (!serviceAccount || !serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        console.error("Firebase Admin SDK Service Account is not set or is invalid in environment variables.");
        throw new Error("Default Firebase service account is not set or is invalid in environment variables.");
    }

    try {
        const app = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: `${serviceAccount.projectId}.appspot.com`,
        });
        firebaseAdminApp = app;
        return app;
    } catch (error: any) {
        console.error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
        throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
    }
}

export async function getDb(): Promise<Firestore> {
  const app = await getFirebaseAdminApp();
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  const app = await getFirebaseAdminApp();
  return getAuth(app);
}

export async function getStorageAdmin(): Promise<any> {
  const app = await getFirebaseAdminApp();
  return getStorage(app);
}
