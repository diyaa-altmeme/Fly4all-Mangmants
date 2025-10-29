'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, GitBranch, Banknote, Building, Users, Home, Briefcase, FileText, Settings, PlusCircle, Link as LinkIcon, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getChartOfAccounts, createAccount } from './actions';
import { updateSettings, getSettings } from '@/app/settings/actions';
import type { AppSettings, TreeNode, AccountType } from '@/lib/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AccountCard = ({ title, description, accountId, accounts, onAccountChange, onAccountCreate }: {
    title: string;
    description: string;
    accountId?: string;
    accounts: TreeNode[];
    onAccountChange: (newAccountId: string) => void;
    onAccountCreate: () => Promise<void>;
}) => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newAccountName, setNewAccountName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        setIsCreating(true);
        await onAccountCreate();
        setIsCreating(false);
        setIsCreateOpen(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Select value={accountId || ""} onValueChange={onAccountChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="اختر حساب..." />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map(acc => (
                             <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>
                        ))}
                         <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                 <div className="text-blue-500 font-bold p-2 cursor-pointer hover:bg-muted" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCreateOpen(true); }}>
                                    + إنشاء حساب جديد
                                </div>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>إنشاء حساب جديد لـ: {title}</DialogTitle>
                                </DialogHeader>
                                {/* This would be a more complex form in a real app */}
                                <div className="space-y-2">
                                    <Label>اسم الحساب الجديد</Label>
                                    <Input value={newAccountName} onChange={e => setNewAccountName(e.target.value)} />
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
                                    <Button onClick={handleCreate} disabled={isCreating}>
                                        {isCreating && <Loader2 className="animate-spin me-2 h-4 w-4" />}
                                        إنشاء وحفظ
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>
    );
}

export default function AdvancedAccountsSetupPage() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [accounts, setAccounts] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const flattenAccounts = (nodes: TreeNode[]): TreeNode[] => {
        let flatList: TreeNode[] = [];
        nodes.forEach(node => {
            flatList.push(node);
            if (node.children && node.children.length > 0) {
                flatList = [...flatList, ...flattenAccounts(node.children)];
            }
        });
        return flatList;
    };

    const loadData = useCallback(async () => {
        try {
            const [settingsData, accountsData] = await Promise.all([
                getSettings(),
                getChartOfAccounts(),
            ]);
            setSettings(settingsData);
            setAccounts(flattenAccounts(accountsData));
        } catch (e: any) {
            toast({ title: "خطأ", description: e.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleMappingChange = async (path: string, value: string) => {
        if (!settings) return;
        
        const pathParts = path.split('.');
        const newSettings = { ...settings };
        let currentLevel: any = newSettings;

        pathParts.forEach((part, index) => {
            if (index === pathParts.length - 1) {
                currentLevel[part] = value;
            } else {
                currentLevel[part] = currentLevel[part] || {};
                currentLevel = currentLevel[part];
            }
        });

        setSettings(newSettings);
        
        // Auto-save on change
        const result = await updateSettings({ accountsMap: newSettings.accountsMap });
         if (result.success) {
            toast({ title: 'تم الحفظ تلقائيًا', description: 'تم تحديث ربط الحساب.'});
        } else {
            toast({ title: 'فشل الحفظ', variant: 'destructive' });
        }
    };
    
    const handleCreateAccount = async (name: string, type: AccountType, parentId: string | null) => {
        try {
            await createAccount({ name, type, parentId, code: `new-${Math.random().toString(36).substr(2, 5)}` });
            toast({ title: 'تم إنشاء الحساب بنجاح' });
            await loadData();
        } catch(e: any) {
             toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
        }
    }


    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const { accountsMap } = settings || {};

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-primary" /> إعداد الحسابات المتقدمة
            </h1>
            
            <Section title="الحسابات الرئيسية" icon={Home}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AccountCard title="الصندوق الافتراضي" description="يستخدم في عمليات القبض والصرف النقدي." accountId={accountsMap?.defaultCashId} accounts={accounts.filter(a => a.type === 'asset')} onAccountChange={(val) => handleMappingChange('defaultCashId', val)} onAccountCreate={() => handleCreateAccount('صندوق جديد', 'asset', 'cash-and-banks')} />
                    <AccountCard title="الحساب البنكي الافتراضي" description="يستخدم في المعاملات البنكية." accountId={accountsMap?.defaultBankId} accounts={accounts.filter(a => a.type === 'asset')} onAccountChange={(val) => handleMappingChange('defaultBankId', val)} onAccountCreate={() => handleCreateAccount('بنك جديد', 'asset', 'cash-and-banks')} />
                    <AccountCard title="حساب الذمم المدينة" description="الحساب الأب لجميع العملاء." accountId={accountsMap?.arAccountId} accounts={accounts.filter(a => a.type === 'asset')} onAccountChange={(val) => handleMappingChange('arAccountId', val)} onAccountCreate={() => handleCreateAccount('ذمم مدينة جديدة', 'asset', 'current-assets')} />
                    <AccountCard title="حساب الذمم الدائنة" description="الحساب الأب لجميع الموردين والشركاء." accountId={accountsMap?.apAccountId} accounts={accounts.filter(a => a.type === 'liability')} onAccountChange={(val) => handleMappingChange('apAccountId', val)} onAccountCreate={() => handleCreateAccount('ذمم دائنة جديدة', 'liability', 'current-liabilities')} />
                    <AccountCard title="إيرادات عامة" description="الحساب الرئيسي لتسجيل الإيرادات غير المصنفة." accountId={accountsMap?.generalRevenueId} accounts={accounts.filter(a => a.type === 'revenue')} onAccountChange={(val) => handleMappingChange('generalRevenueId', val)} onAccountCreate={() => handleCreateAccount('إيرادات عامة جديدة', 'revenue', 'revenues')} />
                    <AccountCard title="مصروفات عامة" description="الحساب الرئيسي لتسجيل المصروفات غير المصنفة." accountId={accountsMap?.generalExpenseId} accounts={accounts.filter(a => a.type === 'expense')} onValueChange={(val) => handleMappingChange('generalExpenseId', val)} onAccountCreate={() => handleCreateAccount('مصروفات عامة جديدة', 'expense', 'expenses')} />
                </div>
            </Section>
            
            <Section title="حسابات الإيرادات المخصصة" icon={Briefcase}>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AccountCard title="إيرادات التذاكر" description="الحساب المخصص لتسجيل أرباح تذاكر الطيران." accountId={accountsMap?.customRevenues?.tickets} accounts={accounts.filter(a => a.type === 'revenue')} onAccountChange={(val) => handleMappingChange('customRevenues.tickets', val)} onAccountCreate={() => handleCreateAccount('إيرادات تذاكر جديدة', 'revenue', 'revenues')} />
                    <AccountCard title="إيرادات الفيزا" description="الحساب المخصص لتسجيل أرباح الفيزا." accountId={accountsMap?.customRevenues?.visas} accounts={accounts.filter(a => a.type === 'revenue')} onAccountChange={(val) => handleMappingChange('customRevenues.visas', val)} onAccountCreate={() => handleCreateAccount('إيرادات فيزا جديدة', 'revenue', 'revenues')} />
                    <AccountCard title="إيرادات الاشتراكات" description="الحساب المخصص لتسجيل أرباح الاشتراكات." accountId={accountsMap?.customRevenues?.subscriptions} accounts={accounts.filter(a => a.type === 'revenue')} onAccountChange={(val) => handleMappingChange('customRevenues.subscriptions', val)} onAccountCreate={() => handleCreateAccount('إيرادات اشتراكات جديدة', 'revenue', 'revenues')} />
                    <AccountCard title="إيرادات السكمنت" description="الحساب المخصص لتسجيل أرباح السكمنت." accountId={accountsMap?.customRevenues?.segments} accounts={accounts.filter(a => a.type === 'revenue')} onAccountChange={(val) => handleMappingChange('customRevenues.segments', val)} onAccountCreate={() => handleCreateAccount('إيرادات سكمنت جديدة', 'revenue', 'revenues')} />
                </div>
            </Section>
            
             <Section title="حسابات المصروفات المخصصة" icon={FileText}>
                 <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AccountCard title="مصاريف الموظفين" description="رواتب، عمولات، ومكافآت." accountId={accountsMap?.customExpenses?.staff} accounts={accounts.filter(a => a.type === 'expense')} onAccountChange={(val) => handleMappingChange('customExpenses.staff', val)} onAccountCreate={() => handleCreateAccount('مصاريف موظفين جديدة', 'expense', 'expenses')} />
                    <AccountCard title="مصاريف تشغيلية" description="إيجارات، فواتير، ومصاريف مكتبية." accountId={accountsMap?.customExpenses?.operations} accounts={accounts.filter(a => a.type === 'expense')} onAccountChange={(val) => handleMappingChange('customExpenses.operations', val)} onAccountCreate={() => handleCreateAccount('مصاريف تشغيلية جديدة', 'expense', 'expenses')} />
                </div>
            </Section>

        </div>
    );
}

const Section = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
)
