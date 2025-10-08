
"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Loader2 } from 'lucide-react';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Directly navigate to the dashboard for development purposes
        router.replace('/dashboard');
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
}
