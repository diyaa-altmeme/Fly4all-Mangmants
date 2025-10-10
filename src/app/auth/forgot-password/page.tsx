
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import app from '@/lib/firebase';
import Link from 'next/link';

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
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">إعادة تعيين كلمة المرور</CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة مرورك.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
                <Alert variant="default" className="bg-green-50 border-green-200">
                    <AlertCircle className="h-4 w-4 text-green-600"/>
                    <AlertTitle className="text-green-800">تم الإرسال بنجاح!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.
                    </AlertDescription>
                </Alert>
            )}
            {!success && (
                <>
                <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <div className="relative">
                        <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                        id="email"
                        type="email"
                        placeholder="example@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pr-10"
                        disabled={loading}
                        required
                        />
                    </div>
                </div>

                <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={loading}
                >
                    {loading ? (
                    <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الإرسال...
                    </>
                    ) : (
                    'إرسال رابط إعادة التعيين'
                    )}
                </Button>
                </>
            )}
             <Button variant="link" asChild className="w-full">
                <Link href="/auth/login">
                    <ArrowRight className="me-2 h-4 w-4" /> العودة لتسجيل الدخول
                </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
