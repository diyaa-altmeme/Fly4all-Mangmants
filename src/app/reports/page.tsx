

import { redirect } from 'next/navigation';

export default function ReportsPage() {
    // Redirect to the debts report page as the default report
    redirect('/reports/debts');
}
