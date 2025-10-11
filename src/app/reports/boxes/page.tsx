
import { redirect } from 'next/navigation';

export default function DeprecatedBoxesReportPage() {
    // Redirect to the main boxes management page
    redirect('/boxes');
}
