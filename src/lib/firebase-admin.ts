
'use server'

import { App, cert, getApp, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { serviceAccount } from './firebase-service-account';

// Holds the single initialized Firebase app instance.
let firebaseAdminApp: App | null = null;

function getFirebaseAdminApp(): App {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }

    // If an app is already initialized, use it.
    if (getApps().length > 0) {
        firebaseAdminApp = getApp();
        return firebaseAdminApp;
    }
    
    // Directly use the imported service account object
    if (!serviceAccount || !serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        console.error("Firebase Admin SDK Service Account object is not valid in firebase-service-account.ts.");
        throw new Error("Default Firebase service account is not valid in firebase-service-account.ts.");
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

// These are now async getters to comply with Next.js Server Action requirements.
export async function getDb(): Promise<Firestore> {
  const app = getFirebaseAdminApp();
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  const app = getFirebaseAdminApp();
  return getAuth(app);
}

export async function getStorageAdmin(): Promise<any> {
  const app = getFirebaseAdminApp();
  return getStorage(app);
}

// Deprecated, but keeping for backward compatibility if some old files still use it.
export async function initializeAdmin(): Promise<App> {
    return getFirebaseAdminApp();
}
