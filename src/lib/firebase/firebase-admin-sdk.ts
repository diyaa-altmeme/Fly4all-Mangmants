

'use server';

import * as admin from 'firebase-admin';
import { getApp, getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import 'server-only';

let app: App;

// The service account object for the Firebase Admin SDK.
const serviceAccount = process.env.FIREBASE_ADMIN_KEY
  ? JSON.parse(process.env.FIREBASE_ADMIN_KEY)
  : undefined;

if (!serviceAccount) {
  console.warn("Firebase Admin Key is not set. Admin SDK features will be disabled.");
}

if (getApps().length === 0 && serviceAccount) {
  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: `${serviceAccount.projectId}.appspot.com`,
  });
} else if (serviceAccount) {
  app = getApp();
}


export async function getDb(): Promise<Firestore> {
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized.");
  }
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized.");
  }
  return getAuth(app);
}

export async function getStorageAdmin(): Promise<any> {
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized.");
  }
  return getStorage(app);
}
