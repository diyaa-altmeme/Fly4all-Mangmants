
"use client";

import { LandingPage } from "@/components/landing-page";
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { useRouter } from 'next/navigation';
import React from "react";

export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!loading && user) {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);
    
    if(loading || user) {
        return <Preloader />
    }
    
    return <LandingPage />;
}

