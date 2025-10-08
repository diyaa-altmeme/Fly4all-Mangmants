
'use client';

import { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'تم الإرسال بنجاح',
        description: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.',
        variant: 'default',
      });
      setMessage('تم إرسال رابط إعادة تعيين كلمة المرور. تحقق من بريدك الإلكتروني.');
    } catch (err: any) {
      setError('فشل إرسال البريد الإلكتروني. يرجى التأكد من صحة البريد المدخل وأنه مسجل بالنظام.');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md">
         <CardHeader className="text-center">
            <CardTitle className="text-2xl">إعادة تعيين كلمة المرور</CardTitle>
             <CardDescription>
                أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا لإعادة تعيين كلمة مرورك.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {!message ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                </div>
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
                </Button>
              </form>
            ) : (
              <p className="text-center text-green-600 bg-green-50 p-4 rounded-md">{message}</p>
            )}

             <div className="mt-4 text-center text-sm">
              <Link href="/auth/login" className="underline">
                العودة إلى صفحة تسجيل الدخول
              </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
