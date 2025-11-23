
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// This component is deprecated. All appearance settings are now in /settings/themes
export default function DeprecatedAppearanceSettings() {
    useEffect(() => {
        redirect('/settings');
    }, []);
    return null;
}
