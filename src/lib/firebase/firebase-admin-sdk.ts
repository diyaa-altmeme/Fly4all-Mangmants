
'use server';

import * as admin from 'firebase-admin';
import { getApp, getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import 'server-only';

let app: App;

const serviceAccountString = process.env.FIREBASE_ADMIN_KEY
  ? Buffer.from(process.env.FIREBASE_ADMIN_KEY, 'base64').toString('utf-8').trim()
  : undefined;

const serviceAccount = serviceAccountString
  ? JSON.parse(serviceAccountString)
  : undefined;


if (!serviceAccount) {
  console.warn("Firebase Admin Key is not set or is malformed. Admin SDK features will be disabled. Check your .env file.");
}

if (getApps().length === 0 && serviceAccount) {
  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
  });
} else if (serviceAccount) {
  app = getApp();
}


export async function getDb(): Promise<Firestore> {
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized. Make sure FIREBASE_ADMIN_KEY is set in your environment variables and is a valid Base64 encoded JSON.");
  }
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized. Make sure FIREBASE_ADMIN_KEY is set in your environment variables and is a valid Base64 encoded JSON.");
  }
  return getAuth(app);
}

export async function getStorageAdmin(): Promise<any> {
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized. Make sure FIREBASE_ADMIN_KEY is set in your environment variables and is a valid Base64 encoded JSON.");
  }
  return getStorage(app);
}

export const authAdmin = getAuthAdmin();
