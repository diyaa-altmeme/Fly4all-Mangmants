

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getAllVouchers } from './actions';
import { getSettings } from '@/app/settings/actions';
import { getClients } from '@/app/relations/actions';
import { getUsers } from '@/app/users/actions';
import { getBoxes } from '@/app/boxes/actions';
import type { AppSettings, Box, Client, Supplier, User, Voucher } from '@/lib/types';
import VouchersListContent from './vouchers-list-content';


export default async function VouchersListPage() {
    const [clientsRes, users, boxes, settings, error] = await Promise.all([
        getClients({ all: true }),
        getUsers(),
        getBoxes(),
        getSettings(),
    ]).then(res => [...res, null]).catch(e => [null, null, null, null, e.message]);
    
    if (error || !clientsRes || !users || !boxes || !settings) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل البيانات."}</AlertDescription>
            </Alert>
        );
    }
    
    const allRelations = clientsRes.clients;
    const clients = allRelations.filter(r => r.relationType === 'client' || r.relationType === 'both');
    const suppliers = allRelations.filter(r => r.relationType === 'supplier' || r.relationType === 'both');

    const vouchers = await getAllVouchers(clients, suppliers, boxes, users, settings);

    return (
        <VouchersListContent
            initialVouchers={vouchers}
            settings={settings}
            clients={clients}
            suppliers={suppliers}
            users={users}
            boxes={boxes}
        />
    );
}

