
"use client";

import { getChartOfAccounts, getFinanceAccountsMap } from "./actions";
import AdvancedAccountsContent from "./components/advanced-accounts-content";
import { Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinanceAccountsMap } from "@/lib/types";

export default function AdvancedAccountsSetupPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [financeAccountsMap, setFinanceAccountsMap] = useState<FinanceAccountsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [accountsData, faMapData] = await Promise.all([
        getChartOfAccounts(),
        getFinanceAccountsMap()
      ]);
      setAccounts(accountsData);
      setFinanceAccountsMap(faMapData);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
      return <Skeleton className="h-[500px] w-full" />
  }

  return (
    <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
      <AdvancedAccountsContent accounts={accounts} financeAccountsMap={financeAccountsMap} />
    </Suspense>
  );
}
