
'use server'

import { App, cert, getApp, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { serviceAccount } from './firebase-service-account';

// Holds the single initialized Firebase app instance.
let firebaseAdminApp: App | null = null;
let firebaseInitializationError: Error | null = null;
let appInitializationPromise: Promise<App> | null = null;

function initializeFirebaseAdminApp(): Promise<App> {
    if (appInitializationPromise) {
        return appInitializationPromise;
    }
    
    appInitializationPromise = new Promise(async (resolve, reject) => {
        if (getApps().length > 0) {
            firebaseAdminApp = getApp();
            resolve(firebaseAdminApp);
            return;
        }
        
        if (!serviceAccount || !serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
            console.error("Firebase Admin SDK Service Account object is not valid.");
            firebaseInitializationError = new Error("Default Firebase service account is not valid in firebase-service-account.ts.");
            reject(firebaseInitializationError);
            return;
        }

        try {
            console.log("Initializing new Firebase Admin SDK app...");
            const app = initializeApp({
                credential: cert(serviceAccount),
                storageBucket: `${''}${serviceAccount.projectId}.appspot.com`,
            });
            firebaseAdminApp = app;
            console.log("Firebase Admin SDK initialized successfully.");
            resolve(app);
        } catch (error: any) {
            console.error(`Failed to initialize Firebase Admin SDK: ${''}${error.message}`);
            firebaseInitializationError = error;
            reject(error);
        }
    });
    
    return appInitializationPromise;
}

async function getFirebaseAdminApp(): Promise<App> {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }
    if (firebaseInitializationError) {
        throw firebaseInitializationError;
    }
    return initializeFirebaseAdminApp();
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
