
'use server';

import * as admin from 'firebase-admin';
import { getApp, getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import 'server-only';

let app: App;

// If the environment variable is not set, or is an empty string, this will be undefined.
const serviceAccountString = process.env.FIREBASE_ADMIN_KEY
  ? Buffer.from(process.env.FIREBASE_ADMIN_KEY, 'base64').toString('utf-8')
  : undefined;

// The service account object for the Firebase Admin SDK.
const serviceAccount = serviceAccountString
  // Clean the string of any bad control characters before parsing.
  ? JSON.parse(serviceAccountString.replace(/[\x00-\x1F\x7F-\x9F]/g, ''))
  : undefined;


if (!serviceAccount) {
  console.warn("Firebase Admin Key is not set or is invalid. Check your .env file. The key should be a Base64 encoded JSON string.");
}

if (getApps().length === 0 && serviceAccount) {
  try {
    app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`,
    });
  } catch (e: any) {
     console.error("Failed to initialize Firebase Admin SDK:", e.message);
  }
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
    throw new Error("Firebase Admin SDK is not initialized.");
  }
  return getAuth(app);
}

export async function getStorageAdmin(): Promise<any> {
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized. Make sure FIREBASE_ADMIN_KEY is set in your environment variables and is a valid Base64 encoded JSON.");
  }
  return getStorage(app);
}
