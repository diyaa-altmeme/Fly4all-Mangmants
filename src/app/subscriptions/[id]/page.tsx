
import { redirect } from 'next/navigation';

export default function DeprecatedSubscriptionDetailPage({ params }: { params: { id: string } }) {
    // This page is deprecated. The main page now handles details.
    // We redirect to the main subscriptions page, but a future improvement
    // could be to open the relevant dialog automatically via query params.
    redirect('/subscriptions');
    
    return null;
}
