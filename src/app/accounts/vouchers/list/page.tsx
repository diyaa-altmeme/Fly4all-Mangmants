
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
import VouchersListContent from './components/vouchers-list-content';
import { revalidatePath } from 'next/cache';

export default async function VouchersListPage() {
    // Moved data fetching inside the component that needs it
    // to avoid passing complex objects between server/client components.

    return (
        <div className="space-y-6">
            <CardHeader className="px-0 sm:px-6">
                <CardTitle>سجل السندات الموحد</CardTitle>
                <CardDescription>
                    عرض جميع السندات والحركات المالية في النظام مع إمكانية الفلترة والبحث.
                </CardDescription>
            </CardHeader>
            <VouchersListContent />
        </div>
    );
}

    