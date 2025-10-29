
"use client";

import React from 'react';
import ChartOfAccountsTree from '@/components/settings/chart-of-accounts-tree';
import type { TreeNode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import AddAccountDialog from './add-account-dialog';

interface AccountingSettingsContentProps {
    initialChartData: TreeNode[];
}

export default function AccountingSettingsContent({ initialChartData }: AccountingSettingsContentProps) {
    const [chartData, setChartData] = React.useState(initialChartData);

    React.useEffect(() => {
        setChartData(initialChartData);
    }, [initialChartData]);

    const handleSuccess = () => {
        // This should trigger a re-fetch or update of the data.
        // For now, we rely on page refresh, but a better implementation would update the state.
        window.location.reload(); 
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <AddAccountDialog 
                    allAccounts={chartData} 
                    onAccountAdded={handleSuccess}
                >
                    <Button>
                        <PlusCircle className="me-2 h-4 w-4" />
                        إضافة حساب جديد
                    </Button>
                </AddAccountDialog>
            </div>
            <ChartOfAccountsTree data={chartData} />
        </div>
    );
}
