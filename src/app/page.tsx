
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { getSettings } from './settings/actions';
import { defaultSettingsData } from '@/lib/defaults';

export default function IndexPage() {
    const { user, loading } = useAuth();
    const [landingPageSettings, setLandingPageSettings] = React.useState(defaultSettingsData.theme.landingPage);
    const [settingsLoading, setSettingsLoading] = React.useState(true);

    useEffect(() => {
        // Fetch settings only if the user is definitively not logged in.
        if (!loading && !user) {
            getSettings()
                .then(settings => {
                    setLandingPageSettings(settings.theme?.landingPage || defaultSettingsData.theme.landingPage);
                })
                .catch(error => {
                    console.error("Failed to load settings for landing page:", error);
                })
                .finally(() => setSettingsLoading(false));
        } else {
            // If user is logged in or auth state is loading, we don't need settings for this component.
            setSettingsLoading(false);
        }
    }, [user, loading]);
    
    // The middleware and MainLayout now handle all redirection logic.
    // This component's only job is to render the landing page if the user is not authenticated.

    if (loading || (!user && settingsLoading)) {
        return <Preloader />;
    }
    
    // If there's a user, MainLayout will handle showing the app or redirecting.
    // This prevents a "flash" of the landing page for authenticated users.
    if (user) {
        return <Preloader />;
    }
    
    // If no user and settings have loaded, show the landing page.
    return <LandingPage settings={landingPageSettings} />;
}
