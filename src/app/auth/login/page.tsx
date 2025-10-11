
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
  
  if (loading) {
    return <Preloader />;
  }
  
  // The MainLayout will handle redirection if the user is already logged in.
  // We just show the login form here.
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
