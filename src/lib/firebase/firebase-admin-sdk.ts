/**
 * @file This file is the server-side Firebase Admin SDK initialization.
 *
 * It is used by server-side code, such as API routes and server components.
 */
'use server';
import { App, applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Decode the base64 encoded service account key from the environment variable.
const serviceAccountString = process.env.FIREBASE_ADMIN_KEY
  ? Buffer.from(process.env.FIREBASE_ADMIN_KEY, 'base64').toString('utf-8')
  : undefined;

// The service account object for the Firebase Admin SDK.
const serviceAccount = serviceAccountString
  // Clean the string of any bad control characters before parsing.
  ? JSON.parse(serviceAccountString)
  : undefined;


let app: App | undefined;

if (!getApps().length) {
  if (!serviceAccount) {
    // In a production environment, you should not log this error message.
    // Instead, you should have a proper error handling mechanism.
    console.error(
      'Firebase Admin SDK service account is not configured. ' +
      'Make sure to set the FIREBASE_ADMIN_KEY environment variable.'
    );
  } else {
    app = initializeApp({
      credential: applicationDefault(),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    });
  }
} else {
  app = getApp();
}

/**
 * Returns an initialized Firebase Admin SDK App instance.
 *
 * @returns {App} An initialized Firebase Admin SDK App instance.
 */
export async function getDb(): Promise<Firestore> {
  if (!app) {
    throw new Error('Firebase Admin SDK is not initialized. Make sure firebase-admin-key.json is configured correctly.');
  }
  return getFirestore(app);
}

/**
 * Returns an initialized Firebase Admin SDK Auth instance.
 *
 * @returns {Auth} An initialized Firebase Admin SDK Auth instance.
 */
export async function getAuthAdmin(): Promise<Auth> {
  if (!app) {
    throw new Error('Firebase Admin SDK is not initialized. Make sure firebase-admin-key.json is configured correctly.');
  }
  return getAuth(app);
}

export async function getStorageAdmin(): Promise<any> {
  if (!app) {
    throw new Error('Firebase Admin SDK is not initialized. Make sure firebase-admin-key.json is configured correctly.');
  }
  return getStorage(app);
}
