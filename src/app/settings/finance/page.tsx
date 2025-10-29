

"use client";

import React, { useEffect } from 'react';
import { redirect } from 'next/navigation';

// This page is now deprecated. The functionality has been moved to /settings/advanced-accounts-setup
export default function DeprecatedFinanceControlCenterPage() {
    useEffect(() => {
        redirect('/settings/advanced-accounts-setup');
    }, []);

    return null; // Render nothing while redirecting
}
