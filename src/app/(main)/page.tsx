
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';

export default function IndexPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.replace('/dashboard');
            } else {
                router.replace('/auth/login');
            }
        }
    }, [user, loading, router]);
    
    return <Preloader />;
}
