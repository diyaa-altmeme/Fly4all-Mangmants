
import { getChartOfAccounts, getFinanceAccountsMap } from "../actions";
import AdvancedAccountsContent from "./advanced-accounts-content";
import type { FinanceAccountsMap } from "@/lib/types";
import ProtectedPage from "@/components/auth/protected-page";

export default async function AdvancedAccountsData() {
    const [accountsData, financeMapData] = await Promise.all([
        getChartOfAccounts(),
        getFinanceAccountsMap()
    ]);
    
    return (
        <ProtectedPage permission="settings:finance:manage">
            <AdvancedAccountsContent accounts={accountsData} financeAccountsMap={financeMapData} />
        </ProtectedPage>
    );
}
