// إعداد Firebase للاستخدام في المتصفح (Client-side)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// معلومات مشروعك في Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBNZ8ZJKKZJKKZJKKZJKKZJKKZJKKZJKK",
  authDomain: "fly4all-mangmants-go-591-d7ffe.firebaseapp.com",
  projectId: "fly4all-mangmants-go-591-d7ffe",
  storageBucket: "fly4all-mangmants-go-591-d7ffe.appspot.com",
  messagingSenderId: "1234567890123",
  appId: "1:1234567890123:web:test123456789",
  measurementId: "G-TEST123456"
};

// تهيئة Firebase (نتحقق إذا كان مهيأ مسبقاً لتجنب الأخطاء)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// إنشاء كائن المصادقة
export const auth: Auth = getAuth(app);

export default app;
