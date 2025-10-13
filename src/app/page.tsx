
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This is the root page. It should ideally show the landing page if not logged in,
// or redirect to dashboard if logged in. The logic is now handled in MainLayout,
// but we can add a client-side redirect as a fallback.
export default function IndexPage() {
    const router = useRouter();
    useEffect(() => {
        // The MainLayout component now handles this logic more robustly.
        // This is just a fallback.
        router.replace('/auth/login');
    }, [router]);
    
    return null; // Render nothing, as the redirect will happen.
}
