'use client';
// This page is temporarily disabled to ensure a stable production build.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientPermissionsPage() {
    const router = useRouter();
    
    useEffect(() => {
        router.push('/coming-soon');
    }, [router]);
    
    return null;
}
