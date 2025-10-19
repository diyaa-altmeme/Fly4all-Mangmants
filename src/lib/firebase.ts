// إعداد Firebase للاستخدام في المتصفح (Client-side)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

// معلومات مشروعك في Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCtlF3onBhtwg0Hh3iOOEjygi9mj81wxrA",
  authDomain: "fly4all-78277122-3cbd0.firebaseapp.com",
  projectId: "fly4all-78277122-3cbd0",
  storageBucket: "fly4all-78277122-3cbd0.appspot.com",
  messagingSenderId: "108505683067",
  appId: "1:108505683067:web:3ab7755349630154e77ede",
  // Add the databaseURL for Realtime Database
  databaseURL: "https://fly4all-78277122-3cbd0.firebaseio.com"
};

// تهيئة Firebase (نتحقق إذا كان مهيأ مسبقاً لتجنب الأخطاء)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// إنشاء وتصدير كائنات الخدمات
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const rtdb: Database = getDatabase(app);

export default app;
