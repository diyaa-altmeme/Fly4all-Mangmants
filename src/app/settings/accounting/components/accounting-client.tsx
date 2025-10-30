
"use client";

import React, { useState, useEffect } from 'react';
import type { TreeNode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import ChartOfAccountsTree from './chart-of-accounts-tree';
import AddAccountDialog from './add-account-dialog';
import { getChartOfAccounts } from '../actions';
import { useToast } from '@/hooks/use-toast';

// This component is the new "Client Boundary" for the Chart of Accounts page.
// It receives the initial data from the parent Server Component.
export default function AccountingSettingsClient({ initialChartData }: { initialChartData: TreeNode[] }) {
    const [chartData, setChartData] = useState(initialChartData);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // The client component can re-fetch data itself if needed, for example, after an update.
    const refreshData = async () => {
        setLoading(true);
        try {
            const data = await getChartOfAccounts();
            setChartData(data);
            toast({ title: "تم تحديث شجرة الحسابات" });
        } catch (error: any) {
            toast({ title: "خطأ", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <AddAccountDialog 
                    allAccounts={chartData} 
                    onAccountAdded={refreshData}
                >
                    <Button disabled={loading}>
                        <PlusCircle className="me-2 h-4 w-4" />
                        إضافة حساب جديد
                    </Button>
                </AddAccountDialog>
            </div>
            {loading ? <p>جاري التحميل...</p> : <ChartOfAccountsTree data={chartData} />}
        </div>
    );
}
