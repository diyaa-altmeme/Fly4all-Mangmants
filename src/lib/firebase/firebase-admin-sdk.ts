
'use server';

import admin, { App } from 'firebase-admin';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// IMPORTANT: Ensure this file is included in .gitignore
// The service account key from a JSON file.
import serviceAccount from '../../../firebase-admin-key.json';


let app: App | undefined;

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return;
  }

  if (!serviceAccount || !serviceAccount.project_id) {
    console.error("Firebase Admin SDK: Service account key is missing or invalid in firebase-admin-key.json.");
    return;
  }
  
  try {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization failed:", error.message);
  }
}

// Call initialization right away
initializeFirebaseAdmin();


export async function getDb(): Promise<Firestore> {
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized. Check server logs for details.");
  }
  return getFirestore(app);
}

export async function getAuthAdmin(): Promise<Auth> {
  if (!app) {
    throw new Error("Firebase Admin SDK is not initialized. Check server logs for details.");
  }
  return getAuth(app);
}

export async function getStorageAdmin() {
    if (!app) {
        throw new Error("Firebase Admin SDK is not initialized. Check server logs for details.");
    }
    return getStorage(app);
}
