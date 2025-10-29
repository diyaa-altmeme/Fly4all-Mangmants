
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import ChartOfAccountsTree from '@/components/settings/chart-of-accounts-tree';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { nanoid } from 'nanoid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const accountFormSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  code: z.string().min(1, "الكود مطلوب"),
  type: z.enum(["asset", "liability", "revenue", "expense", "equity"]),
  parentId: z.string().nullable(),
  isLeaf: z.boolean(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

const AddAccountDialog = ({ accounts, onAccountCreated, parentId, parentType }: { accounts: TreeNode[], onAccountCreated: () => void, parentId?: string | null, parentType?: AccountType }) => {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: { name: '', code: '', type: parentType || 'asset', parentId: parentId || null, isLeaf: true }
    });

    const { isSubmitting } = form.formState;

    const onSubmit = async (data: AccountFormValues) => {
        try {
            await createAccount(data);
            toast({ title: 'تم إنشاء الحساب بنجاح' });
            onAccountCreated();
            setOpen(false);
            form.reset();
        } catch (e: any) {
            toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
        }
    };
    
    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <PlusCircle className="me-2 h-4 w-4" /> إنشاء حساب جديد
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>إنشاء حساب جديد</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><Label>اسم الحساب</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="code" render={({ field }) => ( <FormItem><Label>رقم الحساب</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><Label>نوع الحساب</Label><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="asset">أصل</SelectItem><SelectItem value="liability">التزام</SelectItem><SelectItem value="revenue">إيراد</SelectItem><SelectItem value="expense">مصروف</SelectItem><SelectItem value="equity">حقوق ملكية</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="parentId" render={({ field }) => ( <FormItem><Label>الحساب الأب</Label><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="اختر حسابًا أبًا..." /></SelectTrigger></FormControl><SelectContent>{accounts.filter(a => !a.isLeaf).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />} إنشاء وحفظ</Button>
                        </DialogFooter>
                     </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

const AccountCard = ({ title, description, accountId, accounts, onAccountChange, onAccountCreate }: {
    title: string;
    description: string;
    accountId?: string;
    accounts: TreeNode[];
    onAccountChange: (newAccountId: string) => void;
    onAccountCreate: () => Promise<void>;
}) => {
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
                         {accounts.length > 0 ? (
                            accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>
                            ))
                         ) : (
                             <div className="p-2 text-center text-sm text-muted-foreground">لا توجد حسابات.</div>
                         )}
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
    const { fetchData: refetchNavData } = useVoucherNav();


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
            const [settingsData, chartData] = await Promise.all([
                getSettings(),
                getChartOfAccounts(),
            ]);
            setSettings(settingsData);
            setAccounts(chartData);
        } catch (e: any) {
            toast({ title: "خطأ", description: e.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAccountCreate = async () => {
        await loadData();
        await refetchNavData(true);
    }
    
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
        
        const result = await updateSettings({ accountsMap: newSettings.accountsMap, customRevenueAccounts: newSettings.customRevenueAccounts });
         if (result.success) {
            toast({ title: 'تم الحفظ تلقائيًا', description: 'تم تحديث ربط الحساب.'});
            await refetchNavData(true);
        } else {
            toast({ title: 'فشل الحفظ', variant: 'destructive' });
        }
    };

    if (loading || !settings) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const { accountsMap, customRevenueAccounts } = settings || {};
    const flatAccounts = flattenAccounts(accounts);
    
    const filteredAccounts = {
        assets: flatAccounts.filter((a) => a.type === "asset"),
        liabilities: flatAccounts.filter((a) => a.type === "liability"),
        income: flatAccounts.filter((a) => a.type === "revenue"),
        expense: flatAccounts.filter((a) => a.type === "expense"),
        cash: flatAccounts.filter((a) => a.name.includes("صندوق") || a.name.toLowerCase().includes("cash")),
        bank: flatAccounts.filter((a) => a.name.includes("بنك") || a.name.toLowerCase().includes("bank")),
    };

    return (
        <div className="space-y-6">
            <Section title="الدليل المحاسبي" icon={GitBranch} actions={<AddAccountDialog accounts={flatAccounts} onAccountCreated={handleAccountCreate} />}>
                 <ChartOfAccountsTree data={accounts} />
            </Section>
            
            <Section title="الحسابات الرئيسية" icon={Home}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AccountCard title="الصندوق الافتراضي" description="يستخدم في عمليات القبض والصرف النقدي." accountId={accountsMap?.defaultCashId} accounts={filteredAccounts.cash} onAccountChange={(val) => handleMappingChange('defaultCashId', val)} onAccountCreate={() => handleCreateAccount('صندوق جديد', 'asset', 'cash-and-banks')} />
                    <AccountCard title="الحساب البنكي الافتراضي" description="يستخدم في المعاملات البنكية." accountId={accountsMap?.defaultBankId} accounts={filteredAccounts.bank} onAccountChange={(val) => handleMappingChange('defaultBankId', val)} onAccountCreate={() => handleCreateAccount('بنك جديد', 'asset', 'cash-and-banks')} />
                    <AccountCard title="حساب الذمم المدينة" description="الحساب الأب لجميع العملاء." accountId={accountsMap?.arAccountId} accounts={filteredAccounts.assets} onAccountChange={(val) => handleMappingChange('arAccountId', val)} onAccountCreate={() => handleCreateAccount('ذمم مدينة جديدة', 'asset', 'current-assets')} />
                    <AccountCard title="حساب الذمم الدائنة" description="الحساب الأب لجميع الموردين والشركاء." accountId={accountsMap?.apAccountId} accounts={filteredAccounts.liabilities} onAccountChange={(val) => handleMappingChange('apAccountId', val)} onAccountCreate={() => handleCreateAccount('ذمم دائنة جديدة', 'liability', 'current-liabilities')} />
                    <AccountCard title="إيرادات عامة" description="الحساب الرئيسي لتسجيل الإيرادات غير المصنفة." accountId={accountsMap?.generalRevenueId} accounts={filteredAccounts.income} onAccountChange={(val) => handleMappingChange('generalRevenueId', val)} onAccountCreate={() => handleCreateAccount('إيرادات عامة جديدة', 'revenue', 'revenues')} />
                    <AccountCard title="مصروفات عامة" description="الحساب الرئيسي لتسجيل المصروفات غير المصنفة." accountId={accountsMap?.generalExpenseId} accounts={filteredAccounts.expense} onAccountChange={(val) => handleMappingChange('generalExpenseId', val)} onAccountCreate={() => handleCreateAccount('مصروفات عامة جديدة', 'expense', 'expenses')} />
                </div>
            </Section>
            
            <Section title="حسابات الإيرادات المخصصة" icon={Briefcase}>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AccountCard title="إيرادات التذاكر" description="الحساب المخصص لتسجيل أرباح تذاكر الطيران." accountId={customRevenueAccounts?.ticketsRevenueAccountId} accounts={filteredAccounts.income} onAccountChange={(val) => handleMappingChange('customRevenueAccounts.ticketsRevenueAccountId', val)} onAccountCreate={() => handleCreateAccount('إيرادات تذاكر جديدة', 'revenue', 'revenues')} />
                    <AccountCard title="إيرادات الفيزا" description="الحساب المخصص لتسجيل أرباح الفيزا." accountId={customRevenueAccounts?.visaRevenueAccountId} accounts={filteredAccounts.income} onAccountChange={(val) => handleMappingChange('customRevenueAccounts.visaRevenueAccountId', val)} onAccountCreate={() => handleCreateAccount('إيرادات فيزا جديدة', 'revenue', 'revenues')} />
                    <AccountCard title="إيرادات الاشتراكات" description="الحساب المخصص لتسجيل أرباح الاشتراكات." accountId={customRevenueAccounts?.subscriptionsRevenueAccountId} accounts={filteredAccounts.income} onAccountChange={(val) => handleMappingChange('customRevenueAccounts.subscriptionsRevenueAccountId', val)} onAccountCreate={() => handleCreateAccount('إيرادات اشتراكات جديدة', 'revenue', 'revenues')} />
                    <AccountCard title="إيرادات السكمنت" description="الحساب المخصص لتسجيل أرباح السكمنت." accountId={customRevenueAccounts?.segmentsRevenueAccountId} accounts={filteredAccounts.income} onAccountChange={(val) => handleMappingChange('customRevenueAccounts.segmentsRevenueAccountId', val)} onAccountCreate={() => handleCreateAccount('إيرادات سكمنت جديدة', 'revenue', 'revenues')} />
                </div>
            </Section>
        </div>
    );
}

const Section = ({ title, icon: Icon, children, actions }: { title: string, icon: React.ElementType, children: React.ReactNode, actions?: React.ReactNode }) => (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                 <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</CardTitle>
                 {actions}
            </div>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
)

