
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

// This component is deprecated and its functionality has been removed.
export default function DeprecatedDeveloperSettings() {
    const router = useRouter();
    React.useEffect(() => {
        router.push('/settings');
    }, [router]);
    return null;
}
