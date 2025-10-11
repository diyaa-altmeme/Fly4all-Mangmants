
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

export default function LoginPage() {
  const { user } = useAuth();

  // If the user is already logged in, show a confirmation message instead of the form.
  if (user) {
    return (
        <div className="bg-background">
            <LandingHeader showTitle={true} isScrolled={true} settings={defaultSettingsData.theme.landingPage} />
            <div className="flex items-center justify-center pt-32 pb-16">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 p-3 rounded-full">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <CardTitle className="mt-4">تم تسجيل الدخول بنجاح</CardTitle>
                        <CardDescription>أنت مسجل الدخول حاليًا باسم: {user.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild size="lg" className="w-full">
                            <Link href="/dashboard">الانتقال إلى لوحة التحكم</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }

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
