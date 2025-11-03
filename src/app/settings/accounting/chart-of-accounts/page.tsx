
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getChartOfAccounts } from './actions';
import type { TreeNode } from '@/lib/types';
import AccountsTreeClient from './components/accounts-tree-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import ProtectedPage from '@/components/auth/protected-page';

function ChartOfAccountsContainer() {
    const [accounts, setAccounts] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getChartOfAccounts();
            setAccounts(data);
        } catch (e: any) {
            setError(e.message || "Failed to load accounts.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <AccountsTreeClient
            initialAccounts={accounts}
            onAccountsUpdated={setAccounts}
        />
    )
}

export default function ChartOfAccountsPage() {
    return (
        <ProtectedPage requiredPermission="settings:finance:manage">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الدليل المحاسبي</h1>
                    <p className="text-muted-foreground">
                        عرض وتعديل هيكل الدليل المحاسبي لشركتك.
                    </p>
                </div>
                <ChartOfAccountsContainer />
            </div>
        </ProtectedPage>
    );
}
