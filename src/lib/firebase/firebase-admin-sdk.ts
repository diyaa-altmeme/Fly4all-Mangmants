
'use server';

import * as admin from 'firebase-admin';
import { getApp, getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { serviceAccount } from '@/lib/firebase-service-account';
import 'server-only';

let app: App;

if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: `${serviceAccount.projectId}.appspot.com`,
  });
} else {
  app = getApp();
}

export async function getDb(): Promise<Firestore> {
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  return getAuth(app);
}

export async function getStorageAdmin(): Promise<any> {
    return getStorage(app);
}

    