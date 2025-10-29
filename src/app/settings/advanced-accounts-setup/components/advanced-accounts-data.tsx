
import { getChartOfAccounts, getFinanceAccountsMap } from "../actions";
import AdvancedAccountsContent from "./advanced-accounts-content";

export default async function AdvancedAccountsData() {
    const [accountsData, financeMapData] = await Promise.all([
        getChartOfAccounts(),
        getFinanceAccountsMap()
    ]);
    
    return (
        <AdvancedAccountsContent accounts={accountsData} financeAccountsMap={financeMapData} />
    );
}
