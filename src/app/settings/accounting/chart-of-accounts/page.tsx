// This file is deprecated. The content has been moved to the main accounting settings page.
// This redirect is a fallback for any old links.
import { redirect } from 'next/navigation';

export default function DeprecatedChartOfAccountsPage() {
    redirect('/settings/accounting');
    return null;
}
