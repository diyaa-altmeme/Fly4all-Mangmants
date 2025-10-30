
// This page is now deprecated. The main settings page at /settings
// fetches all necessary data and renders the correct component.
// Keeping this file might cause routing conflicts.
// It's better to remove it or redirect if direct access is still possible.
import { redirect } from 'next/navigation';

export default function DeprecatedAccountingPage() {
    redirect('/settings');
    return null;
}
