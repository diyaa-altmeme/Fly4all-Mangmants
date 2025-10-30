
import React from 'react';
import { Metadata } from 'next';
import { getSettings } from '@/app/settings/actions';
import { getChartOfAccounts } from '@/app/settings/accounting/actions';
import { getUsers } from '@/app/users/actions';
import { getBoxes } from '@/app/boxes/actions';
import { getClients } from '@/app/clients/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { getExchanges } from '@/app/exchanges/actions';
import ProtectedPage from '@/components/auth/protected-page';
import SettingsPageContent from './components/settings-page-content';
import { Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'الإعدادات العامة',
};

async function SettingsPage() {
  let initialSettings, chartOfAccounts, users, boxes, clients, suppliers, exchanges;

  try {
    const data = await Promise.all([
      getSettings(),
      getChartOfAccounts(),
      getUsers(),
      getBoxes(),
      getClients(),
      getSuppliers(),
      getExchanges(),
    ]);

    [
      initialSettings,
      chartOfAccounts,
      users,
      boxes,
      clients,
      suppliers,
      exchanges,
    ] = data;

  } catch (error) {
    // Corrected error logging to show the full error object
    console.error('Error loading settings page data:', error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>فشل تحميل البيانات!</AlertTitle>
          <AlertDescription>
            حدث خطأ غير متوقع أثناء محاولة تحميل بيانات الإعدادات. يرجى مراجعة سجلات الخادم أو المحاولة مرة أخرى لاحقًا.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const financeMap = initialSettings?.finance;

  return (
    <ProtectedPage requiredPermission="settings:read">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">الإعدادات العامة</h1>
          <p className="text-muted-foreground">
            تحكم في جميع جوانب النظام من هذه الواجهة المركزية.
          </p>
        </div>
        <SettingsPageContent
          initialSettings={initialSettings}
          chartOfAccounts={chartOfAccounts}
          financeMap={financeMap}
          users={users}
          boxes={boxes}
          clients={clients}
          suppliers={suppliers}
          exchanges={exchanges}
        />
      </div>
    </ProtectedPage>
  );
}

export default SettingsPage;
