
"use client";

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';

export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!loading && user) {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);

    if (loading || user) {
        return <Preloader />;
    }

    // If no user and not loading, show the landing page.
    return <LandingPage />;
}
