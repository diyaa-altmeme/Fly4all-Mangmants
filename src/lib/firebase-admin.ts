
'use server'

import { App, cert, getApp, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let firebaseAdminApp: App | null = null;

function getServiceAccount(): ServiceAccount {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!serviceAccountStr) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set. Please encode your service account JSON file to Base64 and set it.");
    }
    try {
        const decodedString = Buffer.from(serviceAccountStr, 'base64').toString('utf8');
        return JSON.parse(decodedString);
    } catch (e) {
        console.error("Failed to parse Firebase service account from environment variable.", e);
        throw new Error("Could not parse FIREBASE_SERVICE_ACCOUNT_BASE64. Make sure it's a valid Base64 encoded JSON.");
    }
}

export async function initializeAdmin(): Promise<App> {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }

    if (getApps().length > 0) {
        firebaseAdminApp = getApp();
        return firebaseAdminApp;
    }

    const serviceAccount = getServiceAccount();

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
  const app = await initializeAdmin();
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  const app = await initializeAdmin();
  return getAuth(app);
}

export async function getStorageAdmin(): Promise<any> {
  const app = await initializeAdmin();
  return getStorage(app);
}
