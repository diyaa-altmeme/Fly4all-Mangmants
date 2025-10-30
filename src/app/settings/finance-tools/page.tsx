
// This page is now deprecated. The main settings page at /settings
// fetches all necessary data and renders the correct component.
// This is kept as a redirect for any old bookmarks.
import { redirect } from 'next/navigation';

export default function DeprecatedFinanceToolsPage() {
    redirect('/settings');
    return null;
}
