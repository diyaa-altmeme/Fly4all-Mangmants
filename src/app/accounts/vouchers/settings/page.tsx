
import React from 'react';
import { redirect } from 'next/navigation';

export default function DeprecatedVoucherSettingsPage() {
    redirect('/settings');
    return null;
}
