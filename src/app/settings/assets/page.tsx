// This file is now deprecated. Asset management is handled within the main settings page.
import { redirect } from 'next/navigation';

export default function DeprecatedAssetsPage() {
    redirect('/settings/appearance');
    return null;
}
