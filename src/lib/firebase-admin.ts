
'use server'

import { App, cert, getApp, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { serviceAccount } from './firebase-service-account';

// This holds the memoized promises for Firebase services.
// We use promises to handle the async nature of initialization
// and to ensure we don't try to re-initialize while an initialization is already in progress.
let appPromise: Promise<App> | null = null;
let firebaseInitializationError: Error | null = null;

function initializeFirebaseAdminApp(): Promise<App> {
    if (appPromise) {
        return appPromise;
    }
    
    if (firebaseInitializationError) {
        return Promise.reject(firebaseInitializationError);
    }

    appPromise = new Promise((resolve, reject) => {
        if (getApps().length) {
            const existingApp = getApp();
            resolve(existingApp);
            return;
        }
        
        if (!serviceAccount || !serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
            console.error("Firebase Admin SDK Service Account object is not valid.");
            const err = new Error("Default Firebase service account is not valid in firebase-service-account.ts.");
            firebaseInitializationError = err;
            reject(err);
            return;
        }

        try {
            console.log("Initializing new Firebase Admin SDK app...");
            const newApp = initializeApp({
                credential: cert(serviceAccount),
                storageBucket: `${serviceAccount.projectId}.appspot.com`,
            });
            console.log("Firebase Admin SDK initialized successfully.");
            resolve(newApp);
        } catch (error: any) {
            console.error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
            firebaseInitializationError = error;
            reject(error);
        }
    });

    return appPromise;
}


export async function getDb(): Promise<Firestore> {
  const app = await initializeFirebaseAdminApp();
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  const app = await initializeFirebaseAdminApp();
  return getAuth(app);
}

export async function getStorageAdmin(): Promise<any> {
  const app = await initializeFirebaseAdminApp();
  return getStorage(app);
}
