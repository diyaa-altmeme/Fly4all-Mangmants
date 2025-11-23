
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
    const router = useRouter();
    const [landingPageSettings, setLandingPageSettings] = React.useState(defaultSettingsData.theme.landingPage);
    const [settingsLoading, setSettingsLoading] = React.useState(true);

    useEffect(() => {
        if (!loading && !user) {
            getSettings()
                .then(settings => {
                    setLandingPageSettings(settings.theme?.landingPage || defaultSettingsData.theme.landingPage);
                })
                .catch(error => {
                    console.error("Failed to load settings for landing page:", error);
                })
                .finally(() => setSettingsLoading(false));
        } else if (!loading && user) {
            // User is logged in, middleware will handle redirection.
            // We don't need to do anything here, just wait.
            setSettingsLoading(false);
        }
    }, [user, loading]);
    
    // The middleware now handles redirecting authenticated users from the landing page.
    // This component only needs to handle the state for unauthenticated users.

    if (loading || (!user && settingsLoading)) {
        return <Preloader />;
    }
    
    // If there's a user, middleware will redirect, so we can just show a preloader
    // to avoid a flash of the landing page.
    if (user) {
        return <Preloader />;
    }
    
    return <LandingPage settings={landingPageSettings} />;
}
