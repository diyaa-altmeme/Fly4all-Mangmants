'use client';

import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import Image from 'next/image';
import { Plane } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, redirect them.
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);
  
  if (loading || user) {
    return <Preloader />;
  }
  
  // If no user and not loading, show the login form.
  return (
      <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
        <div className="hidden bg-muted lg:block">
          <Image
            src="https://images.unsplash.com/photo-1542314831-068cd1dbb5ed?q=80&w=2070&auto=format&fit=crop"
            alt="صورة خلفية جذابة لناطحة سحاب أو فندق"
            width="1920"
            height="1080"
            className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          />
        </div>
        <div className="flex items-center justify-center py-12">
            <div className="mx-auto grid w-[350px] gap-6">
                <div className="grid gap-2 text-center">
                    <Plane className="h-10 w-10 mx-auto text-primary" />
                    <h1 className="text-3xl font-bold">تسجيل الدخول</h1>
                    <p className="text-balance text-muted-foreground">
                        أدخل بياناتك للوصول إلى لوحة التحكم الخاصة بك
                    </p>
                </div>
                <LoginForm />
            </div>
        </div>
      </div>
  );
}
