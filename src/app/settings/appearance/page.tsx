
'use client';

import { redirect } from 'next/navigation';

// This component is deprecated. All appearance settings are now in /settings/themes
export default function DeprecatedAppearanceSettings() {
    redirect('/settings/themes');
    return null;
}
