
'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد الخاص بك.');
    } catch (err: any) {
      setError('فشل إرسال البريد الإلكتروني. يرجى التأكد من صحة البريد المدخل وأنه مسجل بالنظام.');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">إعادة تعيين كلمة المرور</h1>
        
        {!message ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center text-gray-600">
              أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا لإعادة تعيين كلمة مرورك.
            </p>
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-3 rounded w-full"
              required
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
            </Button>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </form>
        ) : (
          <p className="text-green-600 text-center bg-green-50 p-4 rounded">{message}</p>
        )}

        <div className="text-center">
          <Link href="/auth/login" className="text-sm underline">
            العودة إلى صفحة تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
