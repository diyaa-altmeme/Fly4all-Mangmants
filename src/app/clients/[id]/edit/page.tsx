
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { getVoucherById } from '@/app/accounts/vouchers/list/actions';
import { getClients } from '@/app/relations/actions';
import { getBoxes } from '@/app/boxes/actions';
import { getSettings } from '@/app/settings/actions';
import EditVoucherForm from './components/edit-voucher-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import { getUsers } from '@/app/users/actions';
import type { AppSettings, Box, Client, User, Supplier } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditVoucherPage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<{
        voucher: any;
        clients: Client[];
        suppliers: Supplier[];
        boxes: Box[];
        users: User[];
        settings: AppSettings;
    } | null>(null);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [voucher, clientsResponse, users, boxes, settings] = await Promise.all([
                getVoucherById(id),
                getClients({ all: true }),
                getUsers(),
                getBoxes(),
                getSettings(),
            ]);

            if (!voucher) {
                notFound();
                return;
            }
            
            const allRelations = clientsResponse.clients;
            const clients = allRelations.filter(r => r.relationType === 'client' || r.relationType === 'both');
            const suppliers = allRelations.filter(r => r.relationType === 'supplier' || r.relationType === 'both');

            setData({ voucher, clients, suppliers, boxes, users, settings });
        } catch (e: any) {
            setError(e.message || "Failed to load voucher data.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error || !data) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل بيانات السند أو البيانات المرتبطة به."}</AlertDescription>
            </Alert>
        )
    }

    return (
        <EditVoucherForm
            voucher={data.voucher}
            clients={data.clients}
            suppliers={data.suppliers}
            boxes={data.boxes}
            users={data.users}
            settings={data.settings}
        />
    );
}
