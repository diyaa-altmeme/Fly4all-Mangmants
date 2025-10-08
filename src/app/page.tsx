"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Preloader from '@/components/layout/preloader';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard');
    }, [router]);
    
    // Show a preloader while redirecting
    return <Preloader />;
}
