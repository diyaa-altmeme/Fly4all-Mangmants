
// This page is deprecated. The functionality is now part of the main bookings page or other reports.
import { redirect } from 'next/navigation';

export default function DeprecatedFlightAnalysisPage() {
    redirect('/bookings');
    return null;
}
