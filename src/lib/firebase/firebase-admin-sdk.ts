'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import serviceAccount from './firebase-admin-key.json';

let app: App | undefined;

if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  app = getApps()[0];
}

export async function getDb(): Promise<Firestore> {
  if (!app) {
    throw new Error('Firebase Admin SDK is not initialized. Make sure firebase-admin-key.json is configured correctly.');
  }
  return getFirestore(app);
}

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
  // Firebase Admin SDK for Storage is not used in the same way as Auth/Firestore.
  // We typically use the google-cloud/storage library directly, initialized with the same credentials.
  // This is a placeholder for that logic if needed.
  // For now, we return a mock or an error.
  throw new Error('Storage Admin is not implemented. Use @google-cloud/storage directly.');
}
