
import { redirect } from 'next/navigation';

// This page is deprecated and its functionality might be merged elsewhere.
// For now, redirecting to a safe page.
export default function SegmentsPage() {
    redirect('/coming-soon');
}
