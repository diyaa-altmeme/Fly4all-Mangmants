
"use client";

import Preloader from '@/components/layout/preloader';

export default function Home() {
    // The routing logic is handled by the MainLayout component.
    // This page just shows a preloader until the auth state is resolved
    // and the user is redirected.
    return <Preloader />;
}
