
import { getChartOfAccounts, getFinanceAccountsMap } from "./actions";
import AdvancedAccountsContent from "./components/advanced-accounts-content";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AdvancedAccountsSetupPage() {

  const [accounts, fa] = await Promise.all([
    getChartOfAccounts(),
    getFinanceAccountsMap()
  ]);

  return (
    <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
      <AdvancedAccountsContent accounts={accounts} financeAccountsMap={fa} />
    </Suspense>
  );
}
