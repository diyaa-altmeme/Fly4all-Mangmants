
"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import LandingPage from '@/components/landing-page';

export default function Home() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.replace('/dashboard');
            }
        }
    }, [user, loading, router]);

    if(loading) {
         return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    // If not loading and no user, show the landing page
    if (!user) {
        return <LandingPage />;
    }

    // If user exists, this will be handled by the useEffect redirect,
    // but we can show a loader in the meantime.
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
}
