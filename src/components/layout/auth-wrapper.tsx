
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User, Client } from '@/lib/types';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import Preloader from './preloader';

const protectedRoutes = ['/dashboard', '/settings', '/users', '/reports', '/clients', '/bookings', '/visas', '/subscriptions', '/accounts', '/hr', '/system', '/profile', '/profit-sharing', '/reconciliation', '/exchanges', '/segments', '/templates', '/campaigns'];
const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin', '/auth/register'];

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkUser = async () => {
            setLoading(true);
            try {
                const currentUser = await getCurrentUserFromSession();
                const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
                
                if (!currentUser && isProtectedRoute) {
                    router.push('/auth/login');
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                router.push('/auth/login');
            }
        };
        
        const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
        if (isPublicRoute) {
            setLoading(false);
        } else {
            checkUser();
        }
    }, [pathname, router]);
    
    if (loading) {
        return <Preloader />;
    }

    return <>{children}</>;
}
