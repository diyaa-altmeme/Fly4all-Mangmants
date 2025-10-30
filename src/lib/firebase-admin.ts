
'use server'

import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { serviceAccount } from './firebase-service-account';

let firebaseAdminApp: App | null = null;
let firebaseInitializationError: Error | null = null;

async function initializeFirebaseAdminApp(): Promise<App> {
    if (getApps().length > 0) {
        firebaseAdminApp = getApp();
        return firebaseAdminApp;
    }
    
    if (!serviceAccount || !serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        const errorMessage = "Default Firebase service account is not valid in firebase-service-account.ts.";
        console.error("Firebase Admin SDK Service Account object is not valid.");
        firebaseInitializationError = new Error(errorMessage);
        throw firebaseInitializationError;
    }

    try {
        console.log("Initializing Firebase Admin SDK...");
        const app = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: `${serviceAccount.projectId}.appspot.com`,
        });
        firebaseAdminApp = app;
        console.log("Firebase Admin SDK initialized successfully.");
        return app;
    } catch (error: any) {
        console.error("Failed to initialize Firebase Admin SDK:", String(error));
        firebaseInitializationError = error instanceof Error ? error : new Error(String(error));
        throw firebaseInitializationError;
    }
}

async function getFirebaseAdminApp(): Promise<App> {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }
    if (firebaseInitializationError) {
        throw firebaseInitializationError;
    }
    return await initializeFirebaseAdminApp();
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
