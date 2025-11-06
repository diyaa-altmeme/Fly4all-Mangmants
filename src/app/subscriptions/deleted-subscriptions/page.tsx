
import { redirect } from 'next/navigation';

// This page is now deprecated.
// All deleted items are consolidated into /system/deleted-log
export default function DeletedSubscriptionsPage() {
    redirect('/system/deleted-log');
}
