

import * as React from 'react';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { getBoxes } from '@/app/boxes/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import SmartEntryContent from './components/smart-entry-content';
import { redirect } from 'next/navigation';

export default async function SmartEntryPage() {
    
    // Redirect to the main bookings page as the smart entry is now a dialog
    redirect('/bookings');

    const [clientsResponse, suppliers, boxes, error] = await Promise.all([
        getClients({ all: true }),
        getSuppliers({ all: true }),
        getBoxes(),
    ]).then(res => [...res, null]).catch(e => [null, null, null, e.message]);

    if (error || !clientsResponse || !suppliers || !boxes) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل البيانات الضرورية لصفحة الإدخال الذكي."}</AlertDescription>
            </Alert>
        );
    }

    return (
        <SmartEntryContent
            clients={clientsResponse.clients}
            suppliers={suppliers}
            boxes={boxes}
        />
    );
}
