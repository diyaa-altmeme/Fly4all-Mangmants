
"use client";

import * as React from 'react';
import { getClientById } from '../actions';
import { getClientTransactions } from '@/app/reports/actions';
import { notFound, useRouter, useParams } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import ClientProfileContent from './components/profile-content';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import type { Client, ClientTransactionSummary } from '@/lib/types';


export default function ClientProfilePage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = React.useState(true);
    const [data, setData] = React.useState<{ client: Client, transactions: ClientTransactionSummary } | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const [client, transactions] = await Promise.all([
                getClientById(id),
                getClientTransactions(id),
            ]);
            
            if (!client) {
                notFound();
                return;
            }
            if (!transactions) {
                 throw new Error("فشل تحميل معاملات العميل.");
            }

            setData({ client, transactions });

        } catch (e: any) {
            setError(e.message || "فشل في تحميل بيانات العميل");
        } finally {
            setLoading(false);
        }
    }, [id]);

    React.useEffect(() => {
        if (user === undefined) return; // Wait for auth context to load
        
        if (user && !('role' in user) && user.id !== id) {
            router.push(`/clients/${user.id}`);
            return;
        }

        fetchData();
    }, [id, user, router, fetchData]);
    

    if (loading || user === undefined) {
        return (
             <div className="space-y-6 p-4">
                <Skeleton className="h-40 w-full rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="p-4">
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>حدث خطأ!</AlertTitle>
                    <AlertDescription>{error || "لم يتم العثور على العميل."}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return <ClientProfileContent client={data.client} transactions={data.transactions} onUpdate={fetchData} />;
}
