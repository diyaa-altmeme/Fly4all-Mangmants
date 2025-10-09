
import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* الشعار */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <span className="text-4xl font-bold text-white tracking-wider">M</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Mudarib Accounting</h1>
          <p className="text-gray-600 mt-1">نظام محاسبي متكامل لشركات السفر والسياحة</p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <LoginForm />

        {/* تذييل */}
        <p className="text-center text-sm text-gray-500 mt-8">
          © 2024 Mudarib. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
