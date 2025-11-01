
'use client';
import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { getSettings } from '@/app/settings/actions';
import { getChartOfAccounts } from '@/app/settings/accounting/chart-of-accounts/actions';
import { getUsers } from '@/app/users/actions';
import { getBoxes } from '@/app/boxes/actions';
import { getClients } from '@/app/clients/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { getExchanges } from '@/app/exchanges/actions';
import ProtectedPage from '@/components/auth/protected-page';
import SettingsPageContent from './components/settings-page-content';
import { Terminal, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppSettings, FinanceAccountsMap, TreeNode, User, Box, Client, Supplier, Exchange } from '@/lib/types';

function SettingsDataContainer() {
    const [initialSettings, setInitialSettings] = useState<AppSettings | null>(null);
    const [chartOfAccounts, setChartOfAccounts] = useState<TreeNode[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [exchanges, setExchanges] = useState<Exchange[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [
              settingsData,
              chartData,
              usersData,
              boxesData,
              clientsResponse,
              exchangesData,
            ] = await Promise.all([
              getSettings(),
              getChartOfAccounts(),
              getUsers(),
              getBoxes(),
              getClients({ all: true, includeInactive: true }),
              getExchanges(),
            ]);

            setInitialSettings(settingsData);
            setChartOfAccounts(chartData);
            setUsers(usersData as User[]);
            setBoxes(boxesData);
            setClients(clientsResponse.clients);
            const supplierData = clientsResponse.clients.filter(c => c.relationType === 'supplier' || c.relationType === 'both');
            setSuppliers(supplierData);
            setExchanges(exchangesData.accounts || []);

        } catch (e: any) {
             console.error('Error loading settings page data:', e);
             setError(e.message || "فشل تحميل البيانات!");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    if (loading) {
        return <div className="p-4"><Skeleton className="h-[600px] w-full" /></div>;
    }

    if (error || !initialSettings) {
        return (
            <div className="p-4">
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>فشل تحميل البيانات!</AlertTitle>
                <AlertDescription>
                    حدث خطأ غير متوقع أثناء محاولة تحميل بيانات الإعدادات. يرجى مراجعة سجلات الخادم أو المحاولة مرة أخرى لاحقًا.
                    <pre className="mt-2 text-xs bg-black/10 p-2 rounded-md">{error}</pre>
                </AlertDescription>
            </Alert>
            </div>
        );
    }
  
    const financeMap = initialSettings?.financeAccounts;
  
    return (
        <SettingsPageContent
            initialSettings={initialSettings}
            chartOfAccounts={chartOfAccounts}
            financeMap={financeMap as FinanceAccountsMap}
            users={users}
            boxes={boxes}
            clients={clients}
            suppliers={suppliers}
            exchanges={exchanges}
        />
    )
}


export default function SettingsPage() {
    return (
        <ProtectedPage requiredPermission="settings:read">
             <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإعدادات العامة</h1>
                    <p className="text-muted-foreground">
                        تحكم في جميع جوانب النظام من هذه الواجهة المركزية.
                    </p>
                </div>
                <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                    <SettingsDataContainer />
                </Suspense>
            </div>
        </ProtectedPage>
    );
}
