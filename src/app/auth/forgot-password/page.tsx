
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import app from '@/lib/firebase';
import Link from 'next/link';
import '../login/futuristic-login.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setLoading(true);
    const auth = getAuth(app);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            setError('هذا البريد الإلكتروني غير مسجل في النظام.');
        } else {
            setError('حدث خطأ أثناء محاولة إرسال رابط إعادة التعيين.');
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="login-page-body min-h-screen flex items-center justify-center p-4">
      <div className="futuristic-card rounded-2xl p-8 max-w-md w-full relative overflow-hidden">
         <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-purple-900 opacity-20 blur-xl"></div>
         <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-indigo-900 opacity-20 blur-xl"></div>

        <div className="flex justify-center mb-6">
            <div className="floating glow relative">
                <i className="fas fa-key text-5xl text-indigo-500"></i>
                <div className="absolute -inset-2 rounded-full bg-indigo-500 opacity-20 blur-md"></div>
            </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
            إعادة تعيين كلمة المرور
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-8" style={{ color: 'var(--muted-text)'}}>
            أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة مرورك.
        </p>
        
        <form onSubmit={handleSubmit} className="grid gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
                <Alert variant="default" className="bg-green-500/10 border-green-500/30 text-green-300">
                    <AlertCircle className="h-4 w-4 text-green-400"/>
                    <AlertTitle className="text-green-300">تم الإرسال بنجاح!</AlertTitle>
                    <AlertDescription className="text-green-400">
                        تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.
                    </AlertDescription>
                </Alert>
            )}
            {!success && (
                <div className="grid gap-2">
                    <Label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--muted-text)'}}>البريد الإلكتروني</Label>
                    <div className="relative">
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <i className="fas fa-envelope text-gray-400"></i>
                        </div>
                        <input
                        id="email"
                        type="email"
                        placeholder="example@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-futuristic w-full pr-10 py-3 px-4 rounded-lg focus:outline-none"
                        disabled={loading}
                        required
                        />
                    </div>
                </div>
            )}

            {!success && (
                <button 
                    type="submit" 
                    className="btn-futuristic w-full py-3" 
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />
                    ) : (
                    'إرسال رابط إعادة التعيين'
                    )}
                </button>
            )}
             <Button variant="link" asChild className="w-full text-indigo-400 hover:text-indigo-300">
                <Link href="/auth/login">
                    <ArrowRight className="me-2 h-4 w-4" /> العودة لتسجيل الدخول
                </Link>
            </Button>
          </form>
      </div>
    </div>
  );
}
