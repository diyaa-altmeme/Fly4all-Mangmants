
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import { getSettings } from '@/app/settings/actions';
import type { LandingPageSettings } from '@/lib/types';
import { defaultSettingsData } from '@/lib/defaults';

// This page now exclusively handles showing the landing page for unauthenticated users.
export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [landingPageSettings, setLandingPageSettings] = useState<LandingPageSettings | null>(null);

    useEffect(() => {
        // If the user is logged in, redirect them away from the landing/login area.
        if (!loading && user) {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);
    
     useEffect(() => {
      async function fetchLandingPageSettings() {
        if (!loading && !user) { // Only fetch for logged-out users
            try {
                const settings = await getSettings();
                setLandingPageSettings(settings.theme?.landingPage || defaultSettingsData.theme.landingPage);
            } catch (error) {
                console.error("Failed to fetch landing page settings:", error);
                setLandingPageSettings(defaultSettingsData.theme.landingPage);
            }
        }
      }
      fetchLandingPageSettings();
    }, [loading, user]);

    // While loading auth state or settings, show a preloader.
    if (loading || !landingPageSettings) {
        return <Preloader />;
    }

    // If there is a user, MainLayout will handle the redirect, but we can return preloader to avoid flicker.
    if (user) {
        return <Preloader />;
    }

    // If no user and not loading, and we have settings, show the landing page.
    return <LandingPage settings={landingPageSettings} />;
}
