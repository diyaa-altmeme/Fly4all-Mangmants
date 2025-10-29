
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { listAccounts, getFinanceSettings, saveFinanceSettings, createAccount, generateAccountCode, type ChartAccount, type FinanceAccountsMap } from './actions';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import { ShieldCheck, Save, PlusCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const linkingSchema = z.object({
  generalRevenueId: z.string().optional(),
  generalExpenseId: z.string().optional(),
  arAccountId: z.string().optional(),
  apAccountId: z.string().optional(),
  defaultCashId: z.string().optional(),
  defaultBankId: z.string().optional(),
  customRevenues: z.object({
    tickets: z.string().optional(),
    visas: z.string().optional(),
    subscriptions: z.string().optional(),
    segments: z.string().optional()
  }).default({}),
  preventDirectCashRevenue: z.boolean().default(true)
});

type LinkingForm = z.infer<typeof linkingSchema>;

export default function AdvancedAccountsSetupPage() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  const form = useForm<LinkingForm>({
    resolver: zodResolver(linkingSchema),
    defaultValues: {
      customRevenues: {},
      preventDirectCashRevenue: true
    }
  });

  // حماية الوصول
  useEffect(() => {
    if (user && !hasPermission?.('admin')) {
      // بإمكانك إعادة توجيه أو عرض رسالة
      toast({ title: 'صلاحية غير كافية', description: 'هذه الصفحة متاحة للمدراء فقط', variant: 'destructive' });
    }
  }, [user, hasPermission, toast]);

  // تحميل البيانات
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [accs, settings] = await Promise.all([listAccounts(), getFinanceSettings()]);
        setAccounts(accs);
        const defaults: LinkingForm = {
          generalRevenueId: settings.generalRevenueId || '',
          generalExpenseId: settings.generalExpenseId || '',
          arAccountId: settings.arAccountId || '',
          apAccountId: settings.apAccountId || '',
          defaultCashId: settings.defaultCashId || '',
          defaultBankId: settings.defaultBankId || '',
          customRevenues: {
            tickets: settings.customRevenues?.tickets || '',
            visas: settings.customRevenues?.visas || '',
            subscriptions: settings.customRevenues?.subscriptions || '',
            segments: settings.customRevenues?.segments || ''
          },
          preventDirectCashRevenue: settings.preventDirectCashRevenue ?? true
        };
        form.reset(defaults);
      } catch (e: any) {
        toast({ title: 'فشل التحميل', description: e?.message || 'خطأ غير معروف', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [form, toast]);

  const byType = useMemo(() => {
    const map: Record<string, ChartAccount[]> = {
      asset: [],
      liability: [],
      equity: [],
      revenue: [],
      expense: []
    };
    accounts.forEach(a => map[a.type]?.push(a));
    return map;
  }, [accounts]);

  async function onSave(v: LinkingForm) {
    const payload: FinanceAccountsMap = {
      generalRevenueId: v.generalRevenueId || undefined,
      generalExpenseId: v.generalExpenseId || undefined,
      arAccountId: v.arAccountId || undefined,
      apAccountId: v.apAccountId || undefined,
      defaultCashId: v.defaultCashId || undefined,
      defaultBankId: v.defaultBankId || undefined,
      customRevenues: {
        tickets: v.customRevenues?.tickets || undefined,
        visas: v.customRevenues?.visas || undefined,
        subscriptions: v.customRevenues?.subscriptions || undefined,
        segments: v.customRevenues?.segments || undefined
      },
      preventDirectCashRevenue: v.preventDirectCashRevenue
    };
    try {
      await saveFinanceSettings(payload);
      toast({ title: 'تم الحفظ', description: 'تم تحديث ربط الحسابات بنجاح.' });
    } catch (e: any) {
      toast({ title: 'فشل الحفظ', description: e?.message || 'خطأ غير معروف', variant: 'destructive' });
    }
  }

  // ========== Dialog إنشاء حساب ==========
  function CreateAccountDialog() {
    const [creating, setCreating] = useState(false);
    const [parentId, setParentId] = useState<string | ''>('');
    const [name, setName] = useState('');
    const [type, setType] = useState<'asset'|'liability'|'equity'|'revenue'|'expense'>('asset');
    const [isLeaf, setIsLeaf] = useState(true);
    const [desc, setDesc] = useState('');
    const [suggestedCode, setSuggestedCode] = useState('');

    const parentLabel = useMemo(() => {
      if (!parentId) return 'بدون أب (جذر)';
      const p = accounts.find(a => a.id === parentId);
      return p ? `${p.code} — ${p.name}` : '—';
    }, [parentId, accounts]);

    const parentsOptions = useMemo(() => {
      // يمكن اختيار أي حساب كأب (غالباً غير Leaf)، لكن نسمح للجميع لتسهيل البناء المبكر
      return accounts;
    }, [accounts]);
    
    useEffect(() => {
        const finalParentId = parentId === 'root' ? null : parentId;
        generateAccountCode(finalParentId || undefined).then(code => {
            setSuggestedCode(code);
        });
    }, [parentId]);


    async function handleCreate() {
      if (!name.trim()) {
        toast({ title: 'اسم الحساب مطلوب', variant: 'destructive' });
        return;
      }
      setCreating(true);
      try {
        const finalParentId = parentId === 'root' ? null : parentId;
        const doc = await createAccount({
          name,
          type,
          parentId: finalParentId || null,
          isLeaf,
          description: desc || ''
        });
        // حدث القائمة فوراً
        const fresh = await listAccounts();
        setAccounts(fresh);
        toast({ title: 'تم الإنشاء', description: `تم إنشاء الحساب ${doc.code} — ${doc.name}` });
        setOpenCreate(false);
        // تفريغ النموذج
        setName(''); setDesc(''); setIsLeaf(true); setParentId(''); setType('asset');
      } catch (e: any) {
        toast({ title: 'فشل الإنشاء', description: e?.message || 'خطأ غير معروف', variant: 'destructive' });
      } finally {
        setCreating(false);
      }
    }

    return (
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <PlusCircle className="h-4 w-4" /> إنشاء حساب جديد
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>إنشاء حساب جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>اسم الحساب</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: إيرادات التذاكر" />
              </div>
              <div>
                <Label>النوع</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">أصل (Asset)</SelectItem>
                    <SelectItem value="liability">التزام (Liability)</SelectItem>
                    <SelectItem value="equity">حقوق ملكية (Equity)</SelectItem>
                    <SelectItem value="revenue">إيراد (Revenue)</SelectItem>
                    <SelectItem value="expense">مصروف (Expense)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>الحساب الأب</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger><SelectValue placeholder="بدون أب (جذر)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">— بدون أب (جذر) —</SelectItem>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">الأب الحالي: {parentLabel}</p>
              </div>
              <div className="space-y-1">
                 <Label>رقم الحساب (تلقائي)</Label>
                 <Input value={suggestedCode} readOnly disabled />
              </div>
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <Label className="block">قابل للترحيل مباشرة (Leaf)</Label>
                  <Switch checked={isLeaf} onCheckedChange={setIsLeaf} />
                </div>
              </div>
            </div>

            <div>
              <Label>وصف (اختياري)</Label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف مختصر" />
            </div>

            <Separator />
            <div className="text-xs text-muted-foreground leading-6">
              <div>✅ سيتم <b>توليد رقم الحساب تلقائيًا</b> حسب حساب الأب وتسلسل الأخوة (مثل: 1.2.3).</div>
              <div>✅ إذا اخترت أبًا، سيتم تعيين الأب تلقائيًا كـ <b>غير Leaf</b> بعد الإنشاء.</div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? '...جارٍ الإنشاء' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function AccountsSelect({
    value, onChange, placeholder, filterType
  }: { value?: string; onChange: (v: string) => void; placeholder: string; filterType?: 'revenue'|'expense'|'asset'|'liability'|'equity' }) {
    const options = filterType ? byType[filterType] : accounts;
    return (
      <div className="flex gap-2">
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {(options || []).map(a => (
              <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (loading) {
    return (
      <div dir="rtl" className="p-6">
        <Card><CardContent className="py-10 text-center">...جارٍ التحميل</CardContent></Card>
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">إعداد الحسابات المتقدمة</h1>
          <p className="text-sm text-muted-foreground">ربط جميع الحسابات الرئيسية بالنظام المالي — مصدر الحقيقة الوحيد للربط.</p>
        </div>
         <CreateAccountDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الحسابات الرئيسية</CardTitle>
          <CardDescription>اربط الحسابات العامة التي يعتمد عليها النظام</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* إيراد/مصروف عام */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>حساب الإيرادات العامة</Label>
              <Controller
                control={form.control}
                name="generalRevenueId"
                render={({ field }) => (
                  <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب إيراد..." filterType="revenue" />
                )}
              />
            </div>
            <div>
              <Label>حساب المصروفات العامة</Label>
              <Controller
                control={form.control}
                name="generalExpenseId"
                render={({ field }) => (
                  <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب مصروف..." filterType="expense" />
                )}
              />
            </div>
          </div>

          {/* الذمم، الصندوق، البنك */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>حساب الذمم المدينة (AR)</Label>
              <Controller
                control={form.control}
                name="arAccountId"
                render={({ field }) => (
                  <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب أصل (غالباً أصل)" />
                )}
              />
            </div>
            <div>
              <Label>حساب الذمم الدائنة (AP)</Label>
              <Controller
                control={form.control}
                name="apAccountId"
                render={({ field }) => (
                  <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب التزام (غالباً التزام)" />
                )}
              />
            </div>
            <div>
              <Label>حساب الصندوق الافتراضي (Cash)</Label>
              <Controller
                control={form.control}
                name="defaultCashId"
                render={({ field }) => (
                  <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب صندوق (أصل)" filterType="asset" />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>حساب البنك الافتراضي (Bank)</Label>
              <Controller
                control={form.control}
                name="defaultBankId"
                render={({ field }) => (
                  <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب بنك (أصل)" filterType="asset" />
                )}
              />
            </div>

            <div className="col-span-2 flex items-center gap-3 border rounded-md p-3">
              <Switch
                checked={form.watch('preventDirectCashRevenue')}
                onCheckedChange={(v) => form.setValue('preventDirectCashRevenue', v)}
              />
              <div>
                <div className="font-semibold">منع ترحيل الإيراد مباشرة للصندوق</div>
                <div className="text-xs text-muted-foreground">يفرض مرور الإيراد على حساب الإيرادات أولاً، ثم تحويله للصندوق عبر قيد منفصل.</div>
              </div>
            </div>
          </div>

          <Separator className="my-2" />

          {/* إيرادات مخصصة */}
          <div>
            <div className="font-semibold mb-2">إيرادات مخصصة حسب نوع العملية</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>إيرادات التذاكر</Label>
                <Controller
                  control={form.control}
                  name="customRevenues.tickets"
                  render={({ field }) => (
                    <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب إيراد... (تذاكر)" filterType="revenue" />
                  )}
                />
              </div>
              <div>
                <Label>إيرادات الفيزا</Label>
                <Controller
                  control={form.control}
                  name="customRevenues.visas"
                  render={({ field }) => (
                    <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب إيراد... (فيزا)" filterType="revenue" />
                  )}
                />
              </div>
              <div>
                <Label>إيرادات الاشتراكات</Label>
                <Controller
                  control={form.control}
                  name="customRevenues.subscriptions"
                  render={({ field }) => (
                    <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب إيراد... (اشتراكات)" filterType="revenue" />
                  )}
                />
              </div>
              <div>
                <Label>إيرادات السكمنت</Label>
                <Controller
                  control={form.control}
                  name="customRevenues.segments"
                  render={({ field }) => (
                    <AccountsSelect value={field.value} onChange={field.onChange} placeholder="اختر حساب إيراد... (سكمنت)" filterType="revenue" />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => form.reset()}>
              إعادة ضبط
            </Button>
            <Button onClick={form.handleSubmit(onSave)} className="gap-2">
              <Save className="h-4 w-4" /> حفظ الربط
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ملاحظات تطبيقية</CardTitle>
          <CardDescription>كيف يُستخدم هذا الربط داخل النظام</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• جميع عمليات الترحيل المحاسبي (postJournal) يجب أن تقرأ من <b>settings/app_settings.financeAccounts</b>.</p>
          <p>• عند تفعيل خيار <b>منع ترحيل الإيراد مباشرة في الصندوق</b>، يقوم النظام بإنشاء قيدين: الأول يثبت الإيراد على حساب الإيراد المختار، والثاني يحوّل المبلغ إلى الصندوق (إن لزم) بعملية تحصيل منفصلة.</p>
          <p>• الحسابات “المخصصة” (تذاكر/فيزا/اشتراكات/سكمنت) تُفضَّل على الحساب العام للإيرادات إن كانت معرَّفة.</p>
        </CardContent>
      </Card>
    </div>
  );
}

    