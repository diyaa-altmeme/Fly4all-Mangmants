
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { getSettings } from './settings/actions';
import { defaultSettingsData } from '@/lib/defaults';

export default function IndexPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [landingPageSettings, setLandingPageSettings] = React.useState(defaultSettingsData.theme.landingPage);
    const [settingsLoading, setSettingsLoading] = React.useState(true);

    useEffect(() => {
        if (!loading && user) {
            router.replace('/dashboard');
        } else if (!loading && !user) {
            getSettings()
                .then(settings => {
                    setLandingPageSettings(settings.theme?.landingPage || defaultSettingsData.theme.landingPage);
                })
                .catch(error => {
                    console.error("Failed to load settings for landing page:", error);
                })
                .finally(() => setSettingsLoading(false));
        }
    }, [user, loading, router]);
    
    if (loading || (!user && settingsLoading)) {
        return <Preloader />;
    }
    
    if (!user) {
        return <LandingPage settings={landingPageSettings} />;
    }
    
    return null; // Should be redirected
}
