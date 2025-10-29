"use client";

import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ProtectedPage from '@/components/auth/protected-page';
import AdvancedAccountsData from "./components/advanced-accounts-data";

// This is now a CLIENT component that orchestrates the Suspense boundary
export default function AdvancedAccountsSetupPage() {
  return (
    <ProtectedPage permission="settings:finance:manage">
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
          {/* @ts-expect-error Server Component is being used in a Client Component */}
          <AdvancedAccountsData />
        </Suspense>
    </ProtectedPage>
  );
}
