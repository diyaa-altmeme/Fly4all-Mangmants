
import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ProtectedPage from '@/components/auth/protected-page';
import AdvancedAccountsData from "./components/advanced-accounts-data";

export default async function AdvancedAccountsSetupPage() {
  return (
    <ProtectedPage permission="settings:finance:manage">
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
          <AdvancedAccountsData />
        </Suspense>
    </ProtectedPage>
  );
}
