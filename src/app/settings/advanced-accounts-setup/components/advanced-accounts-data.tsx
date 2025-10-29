
'use client';

import { getChartOfAccounts, getFinanceAccountsMap } from "../actions";
import AdvancedAccountsContent from "./advanced-accounts-content";
import type { FinanceAccountsMap } from "@/lib/types";
import { useEffect, useState } from "react";
import ProtectedPage from "@/components/auth/protected-page";

export default function AdvancedAccountsData() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [financeAccountsMap, setFinanceAccountsMap] = useState<FinanceAccountsMap>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const [accountsData, financeMapData] = await Promise.all([
                getChartOfAccounts(),
                getFinanceAccountsMap()
            ]);
            setAccounts(accountsData);
            setFinanceAccountsMap(financeMapData);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return <div>جاري تحميل بيانات الحسابات...</div>;
    }

    return (
        <ProtectedPage permission="settings:finance:manage">
            <AdvancedAccountsContent accounts={accounts} financeAccountsMap={financeAccountsMap} />
        </ProtectedPage>
    );
}
