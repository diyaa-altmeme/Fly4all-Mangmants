
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import type { TreeNode } from '@/lib/types';
import AccountsTree from './accounts-tree';
import AccountFormDialog from './account-form';
import { getChartOfAccounts } from '../actions';

interface AccountsTreeClientProps {
  initialAccounts: TreeNode[];
  onAccountsUpdated?: (accounts: TreeNode[]) => void;
}

export default function AccountsTreeClient({ initialAccounts, onAccountsUpdated }: AccountsTreeClientProps) {
    const [accounts, setAccounts] = useState<TreeNode[]>(initialAccounts);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setAccounts(initialAccounts);
    }, [initialAccounts]);

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getChartOfAccounts();
            setAccounts(data);
            onAccountsUpdated?.(data);
            toast({ title: 'تم تحديث شجرة الحسابات' });
        } catch (error: any) {
            toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast, onAccountsUpdated]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>الدليل المحاسبي</CardTitle>
                    <CardDescription>عرض وتعديل هيكل الدليل المحاسبي.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <AccountFormDialog allAccounts={accounts} onAccountAdded={refreshData}>
                        <Button variant="outline" size="sm" disabled={loading}>
                            <PlusCircle className="me-2 h-4 w-4" />
                            إضافة حساب
                        </Button>
                    </AccountFormDialog>
                    <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
                        <RefreshCw className="me-2 h-4 w-4" />
                        تحديث
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-[400px]" />
                ) : (
                    <AccountsTree accounts={accounts} onActionSuccess={refreshData} />
                )}
            </CardContent>
        </Card>
    );
}

