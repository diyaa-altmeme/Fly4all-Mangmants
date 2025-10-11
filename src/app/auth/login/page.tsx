
'use client';

import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // If the user is already logged in, redirect them to the dashboard.
    // This handles the case where a logged-in user tries to navigate to /auth/login.
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // While loading or if user is found, show a preloader to prevent flashing the login form.
  if (loading || user) {
    return <Preloader />;
  }
  
  // If no user and not loading, show the login form.
  return (
      <div className="flex items-center justify-center pt-16">
        <div className="w-full max-w-md">
            <LoginForm />
        </div>
      </div>
  );
}
