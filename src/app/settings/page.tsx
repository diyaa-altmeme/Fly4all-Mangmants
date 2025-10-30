
import React from 'react';
import ProtectedPage from '@/components/auth/protected-page';
import SettingsPageContent from './components/settings-page-content';
import { getSettings } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getChartOfAccounts, getFinanceAccountsMap } from './accounting/actions';
import { getUsers } from '../users/actions';
import { getBoxes } from '../boxes/actions';
import { getSuppliers } from '../suppliers/actions';
import { getClients } from '../relations/actions';
import { getExchanges } from '../exchanges/actions';

// This is the main Server Component for the settings page.
// It fetches ALL necessary data for all sub-settings pages.
async function SettingsDataContainer() {
    // Fetch all data in parallel
    const [
        settings, 
        chartOfAccounts, 
        financeMap, 
        users, 
        boxes,
        clientsRes,
        suppliers,
        exchangesRes,
        error
    ] = await Promise.all([
        getSettings(),
        getChartOfAccounts(),
        getFinanceAccountsMap(),
        getUsers({ all: true }),
        getBoxes(),
        getClients({ all: true }),
        getSuppliers(),
        getExchanges(),
    ]).then(res => [...res, null]).catch(e => [null, null, null, null, null, null, null, null, e.message]);
    
    if (error || !settings) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل الإعدادات الرئيسية."}</AlertDescription>
            </Alert>
        );
    }
    
    // Pass all fetched data down to the client component.
    return (
        <SettingsPageContent 
            initialSettings={settings}
            chartOfAccounts={chartOfAccounts || []}
            financeMap={financeMap || {}}
            users={users || []}
            boxes={boxes || []}
            clients={clientsRes?.clients || []}
            suppliers={suppliers || []}
            exchanges={exchangesRes?.accounts || []}
        />
    );
}

export default function SettingsPage() {
    return (
        <ProtectedPage requiredPermission="settings:read">
            <div className="space-y-6">
                 <div className="px-0 sm:px-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإعدادات العامة</h1>
                    <p className="text-muted-foreground">
                        تحكم في جميع جوانب النظام من هذه الواجهة المركزية.
                    </p>
                </div>
                <React.Suspense fallback={<div>جاري تحميل إعدادات النظام...</div>}>
                    <SettingsDataContainer />
                </React.Suspense>
            </div>
        </ProtectedPage>
    );
}
