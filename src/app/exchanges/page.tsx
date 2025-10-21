
import { redirect } from 'next/navigation';

export default function ExchangesPage() {
    // Redirect to the detailed report page by default
    redirect('/exchanges/report');
}
