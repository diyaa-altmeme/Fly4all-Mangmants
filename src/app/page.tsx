"use client";

import Preloader from '@/components/layout/preloader';

export default function Home() {
    // The routing logic is now entirely handled by the AuthProvider and MainLayout
    // based on the authentication state. This page just acts as a loading placeholder.
    return <Preloader />;
}
