import { getChartOfAccounts, getFinanceAccountsMap } from "../actions";
import AdvancedAccountsContent from "./advanced-accounts-content";

// This is now the pure SERVER component that fetches data
export default async function AdvancedAccountsData() {
    const [accountsData, financeMapData] = await Promise.all([
        getChartOfAccounts(),
        getFinanceAccountsMap()
    ]);
    
    return (
        <AdvancedAccountsContent accounts={accountsData} financeAccountsMap={financeMapData} />
    );
}
