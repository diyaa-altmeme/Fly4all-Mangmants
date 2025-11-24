
'use server';

import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

// نحافظ على instance واحدة فقط مهما تعددت البيئات أو إعادة تحميل السيرفر
let firebaseAdminApp: App | null = null;

function getOrInitAdminApp(): App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  // نقرأ مفتاح الخدمة
  const key = process.env.FIREBASE_ADMIN_KEY;
  if (!key) {
    console.error("FIREBASE_ADMIN_KEY is missing from environment variables.");
    throw new Error("Missing FIREBASE_ADMIN_KEY");
  }

  const serviceAccount = JSON.parse(key);

  // إذا يوجد App جاهز → استخدمه
  if (getApps().length > 0) {
    firebaseAdminApp = getApps()[0]!;
    return firebaseAdminApp;
  }

  // إنشاء App جديد
  firebaseAdminApp = initializeApp({
    credential: cert(serviceAccount),
  });

  return firebaseAdminApp;
}

// Firestore instance
export async function getDb(): Promise<Firestore> {
  const app = getOrInitAdminApp();
  return getFirestore(app);
}

// Auth instance
export async function getAuthAdmin(): Promise<Auth> {
  const app = getOrInitAdminApp();
  return getAuth(app);
}

// Storage instance
export async function getStorageAdmin(): Promise<Storage> {
  const app = getOrInitAdminApp();
  return getStorage(app);
}
