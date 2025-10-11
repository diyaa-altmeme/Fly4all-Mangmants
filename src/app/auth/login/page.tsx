
'use client';

import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { LandingPage, LandingHeader } from '@/components/landing-page';
import { defaultSettingsData } from '@/lib/defaults';
import Preloader from '@/components/layout/preloader';

export default function LoginPage() {
  const { user, loading } = useAuth();

  // While checking for user, show a preloader if we are not on the login page itself.
  // On the login page, we want to show the form until the MainLayout handles the redirect.
  if (loading && typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
    return <Preloader />;
  }
  
  // If the user is logged in, MainLayout will redirect to the dashboard.
  // Showing a preloader here prevents a flash of the login form.
  if (user) {
    return <Preloader />;
  }

  // Only show the login form if there is no user and not loading.
  return (
    <div className="bg-background">
        <LandingHeader showTitle={true} isScrolled={false} settings={defaultSettingsData.theme.landingPage} />
        <div className="flex items-center justify-center pt-32 pb-16">
        <div className="w-full max-w-md">
            {/* نموذج تسجيل الدخول */}
            <LoginForm />
        </div>
        </div>
    </div>
  );
}
