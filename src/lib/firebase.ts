// إعداد Firebase للاستخدام في المتصفح (Client-side)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// معلومات مشروعك في Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// تهيئة Firebase (نتحقق إذا كان مهيأ مسبقاً لتجنب الأخطاء)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// إنشاء كائن المصادقة
export const auth: Auth = getAuth(app);

export default app;
