
import { redirect } from 'next/navigation';

export default function SuppliersPage() {
    // This page is deprecated as suppliers are now managed under /clients
    redirect('/clients?relationType=supplier');
    return null;
}
