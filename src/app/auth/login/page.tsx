'use client';

import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <Preloader />;
  }
  
  // If user is already logged in, redirect them.
  // This check is important on the client side.
  if (user) {
    router.replace('/dashboard');
    return <Preloader />;
  }
  
  // If no user and not loading, show the login form.
  return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
            <LoginForm />
        </div>
      </div>
  );
}
