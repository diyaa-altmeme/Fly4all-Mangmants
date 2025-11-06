
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Terminal, History, Trash2, Undo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDeletedVouchers, type DeletedVoucher } from '../actions';
import DeletedVouchersTable from './deleted-vouchers-table';


export default function DeletedLogContainer() {
    const [logs, setLogs] = useState<DeletedVoucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDeletedVouchers();
            setLogs(data);
        } catch (e: any) {
            setError(e.message || "فشل تحميل البيانات.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    return <DeletedVouchersTable initialData={logs} onDataChanged={fetchData} />;
}
