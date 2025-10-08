
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const protectedRoutes = ['/dashboard'];

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === 'loading') return; // Do nothing while loading

        const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

        if (!session && isProtectedRoute) {
            router.push('/auth/login');
        }

        if (session && pathname.startsWith('/auth/login')) {
            router.push('/dashboard');
        }

    }, [session, status, router, pathname]);

    if (status === 'loading') {
        return <div>Loading...</div>;
    }

    return <>{children}</>;
}
