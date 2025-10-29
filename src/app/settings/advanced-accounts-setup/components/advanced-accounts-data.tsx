
import { getChartOfAccounts, getFinanceAccountsMap } from "../actions";
import AdvancedAccountsContent from "./advanced-accounts-content";
import type { FinanceAccountsMap } from "@/lib/types";

export default async function AdvancedAccountsData() {
    const [accounts, financeAccountsMap] = await Promise.all([
        getChartOfAccounts(),
        getFinanceAccountsMap()
    ]);

    return <AdvancedAccountsContent accounts={accounts} financeAccountsMap={financeAccountsMap} />
}
