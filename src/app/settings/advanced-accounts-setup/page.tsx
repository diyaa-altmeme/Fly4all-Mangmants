import { getChartOfAccounts, getFinanceAccountsMap } from "./actions";
import AdvancedAccountsContent from "./components/advanced-accounts-content";
import ProtectedPage from "@/components/auth/protected-page";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AdvancedAccountsSetupPage() {
    const [accounts, financeMap] = await Promise.all([
        getChartOfAccounts(),
        getFinanceAccountsMap()
    ]);

    return (
        <ProtectedPage permission="settings:finance:manage">
            <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
                 <AdvancedAccountsContent accounts={accounts} financeAccountsMap={financeMap} />
            </Suspense>
        </ProtectedPage>
    );
}
