
import { getChartOfAccounts, getFinanceAccountsMap } from "./actions";
import AdvancedAccountsContent from "./components/advanced-accounts-content";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { FinanceAccountsMap } from "@/lib/types";
import ProtectedPage from "@/components/auth/protected-page";


async function AdvancedAccountsData() {
    const [accounts, financeAccountsMap] = await Promise.all([
        getChartOfAccounts(),
        getFinanceAccountsMap()
    ]);

    return <AdvancedAccountsContent accounts={accounts} financeAccountsMap={financeAccountsMap} />
}


export default function AdvancedAccountsSetupPage() {
  return (
    <ProtectedPage permission="settings:finance:manage">
        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
          <AdvancedAccountsData />
        </Suspense>
    </ProtectedPage>
  );
}
