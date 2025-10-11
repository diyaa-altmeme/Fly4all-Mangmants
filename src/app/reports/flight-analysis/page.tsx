
import { redirect } from 'next/navigation';

// This page is now an alias for the more advanced data audit page.
export default function FlightAnalysisRedirectPage() {
    redirect('/system/data-audit');
}
