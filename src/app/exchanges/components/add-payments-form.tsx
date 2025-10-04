
"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, PlusCircle, Trash2, Edit, Calendar as CalendarIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumericInput } from '@/components/ui/numeric-input';
import { savePayments } from '../actions';
import type { ExchangePayment, Currency, Exchange, UnifiedLedgerEntry } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Autocomplete } from '@/components/ui/autocomplete';

type Row = {
  id: string;
  paidTo: string;
  type: 'payment' | 'receipt';
  intermediary?: string;
  originalCurrency: Currency;
  originalAmount: number | "";
  rate: number | "";
  date: string;
  note: string;
};

const LAST_PAYMENT_RATE_KEY = 'lastPaymentExchangeRate';


interface AddPaymentsFormProps {
  exchangeId: string;
  exchanges: Exchange[];
  onSuccess: (newBatch: UnifiedLedgerEntry) => void;
  isEditing?: boolean;
  initialData?: any[];
  batchId?: string;
  onStagedEntriesChange: (count: number) => void;
  onSummaryChange: (summary: Record<string, number>) => void;
}

const AddPaymentsForm = forwardRef(({ exchangeId: initialExchangeId, exchanges, onSuccess, isEditing = false, initialData = [], batchId, onStagedEntriesChange, onSummaryChange }: AddPaymentsFormProps, ref) => {
  const { data: navData } = useVoucherNav();
  const { toast } = useToast();
  const [stagedEntries, setStagedEntries] = useState<Row[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentExchangeId, setCurrentExchangeId] = useState(initialExchangeId);

  const defaultCurrency = navData?.settings?.currencySettings?.defaultCurrency || 'USD';
  
  const emptyEntry: Omit<Row, 'id'> = {
    paidTo: "",
    type: 'payment',
    intermediary: "",
    originalCurrency: defaultCurrency,
    originalAmount: "",
    rate: navData?.settings?.currencySettings?.exchangeRates['USD_IQD'] || 1,
    date: new Date().toISOString().slice(0, 10),
    note: ""
  };
  
  const [currentEntry, setCurrentEntry] = useState<Omit<Row, 'id'>>(emptyEntry);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    onStagedEntriesChange(stagedEntries.length);
  }, [stagedEntries, onStagedEntriesChange]);
  
  const summary = useMemo(() => {
    const totals = stagedEntries.reduce((acc, entry) => {
        const currency = entry.originalCurrency;
        const amount = Number(entry.originalAmount) || 0;
        const signedAmount = entry.type === 'payment' ? amount : -amount;

        const amountInUSD = entry.originalCurrency === 'USD' ? signedAmount : signedAmount / (Number(entry.rate) || 1);

        if (!acc[currency]) {
            acc[currency] = 0;
        }
        acc[currency] += signedAmount;
        acc.totalUSD = (acc.totalUSD || 0) + amountInUSD;
        return acc;
    }, {} as Record<string, number>);

    return totals;
  }, [stagedEntries]);

  useEffect(() => {
    onSummaryChange(summary);
  }, [summary, onSummaryChange]);


  useEffect(() => {
    const lastRate = localStorage.getItem(LAST_PAYMENT_RATE_KEY);
    if(lastRate) {
        setCurrentEntry(prev => ({...prev, rate: parseFloat(lastRate)}));
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      setStagedEntries(initialData.map(item => ({
        id: item.id || uuidv4(),
        paidTo: item.paidTo || '',
        type: item.type || 'payment',
        intermediary: item.intermediary || '',
        originalCurrency: item.originalCurrency || defaultCurrency,
        originalAmount: item.originalAmount || '',
        rate: item.rate || 1,
        date: item.date || new Date().toISOString().slice(0, 10),
        note: item.note || ''
      })));
      setCurrentExchangeId(initialData[0]?.exchangeId || initialExchangeId);
    }
  }, [isEditing, initialData, defaultCurrency, initialExchangeId]);

  const handleInputChange = (field: keyof Omit<Row, 'id'>, value: any) => {
    setCurrentEntry(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddOrUpdateEntry = () => {
    if (!currentEntry.paidTo || !currentEntry.originalAmount) {
        toast({ title: 'بيانات ناقصة', description: 'الرجاء إدخال الطرف والمبلغ.', variant: 'destructive'});
        return;
    }

    if (editingId) {
        setStagedEntries(prev => prev.map(entry => entry.id === editingId ? { ...currentEntry, id: editingId } : entry));
        setEditingId(null);
        toast({ title: "تم تحديث التسديد" });
    } else {
        setStagedEntries(prev => [...prev, { id: uuidv4(), ...currentEntry }]);
    }
    
     if(currentEntry.rate) {
        localStorage.setItem(LAST_PAYMENT_RATE_KEY, String(currentEntry.rate));
    }

    setCurrentEntry({
        ...emptyEntry,
        rate: currentEntry.rate,
        date: currentEntry.date,
    });
  };
  
  const handleEdit = (entry: Row) => {
    setEditingId(entry.id);
    setCurrentEntry({
        paidTo: entry.paidTo,
        type: entry.type,
        intermediary: entry.intermediary,
        originalCurrency: entry.originalCurrency,
        originalAmount: entry.originalAmount,
        rate: entry.rate,
        date: entry.date,
        note: entry.note,
    });
  };

  const removeEntry = (id: string) => {
    setStagedEntries(prev => prev.filter(r => r.id !== id));
  }

  const handleSave = async (): Promise<UnifiedLedgerEntry | null> => {
    if (!currentExchangeId) {
        toast({ title: "اختر بورصة أولاً", variant: "destructive" });
        return null;
    }
    if (stagedEntries.length === 0) return null;
    setIsSaving(true);
    
    try {
        const payload = stagedEntries.map(r => ({
            paidTo: r.paidTo, 
            type: r.type,
            intermediary: r.intermediary,
            originalCurrency: r.originalCurrency,
            originalAmount: Number(r.originalAmount), 
            rate: Number(r.rate) || 1, 
            date: r.date, 
            note: r.note,
        }));
        const result = await savePayments(currentExchangeId, payload as any, batchId);
        if (!result.success || !result.batch) throw new Error(result.error);
        toast({ title: `تم ${isEditing ? 'تحديث' : 'حفظ'} التسديدات بنجاح` });
        setStagedEntries([]);
        return result.batch;
    } catch (e: any) {
        toast({ title: "خطأ", description: e.message, variant: "destructive" });
        return null;
    } finally {
        setIsSaving(false);
    }
  };

   useImperativeHandle(ref, () => ({
    handleSave,
    isSaving,
    summary,
  }));
  
  const amountInUSD = currentEntry.originalCurrency === 'USD' 
        ? Number(currentEntry.originalAmount) 
        : Number(currentEntry.originalAmount) / (Number(currentEntry.rate) || 1);

  const currencyOptions = navData?.settings?.currencySettings?.currencies || [];

  return (
    <div className="h-full flex flex-col gap-4">
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{editingId ? `تعديل تسديد` : 'إضافة تسديد جديد للقائمة'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                 {isEditing && (
                    <div className="space-y-1.5 max-w-sm">
                        <Label>تغيير البورصة</Label>
                        <Select value={currentExchangeId} onValueChange={setCurrentExchangeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر بورصة..." />
                            </SelectTrigger>
                            <SelectContent>
                                {exchanges.map(ex => (
                                    <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-2 space-y-1.5"><Label>نوع الدفعة</Label>
                        <Select value={currentEntry.type} onValueChange={(val: 'payment' | 'receipt') => handleInputChange('type', val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="payment">تسديد (لنا)</SelectItem>
                                <SelectItem value="receipt">قبض (علينا)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-3 space-y-1.5"><Label>{currentEntry.type === 'payment' ? 'تم التسديد إلى' : 'تم القبض من'}</Label><Input placeholder="الطرف..." value={currentEntry.paidTo} onChange={(e) => handleInputChange('paidTo', e.target.value)} /></div>
                    <div className="md:col-span-3 space-y-1.5"><Label>الوسيط</Label><Input placeholder="الوسيط" value={currentEntry.intermediary} onChange={(e) => handleInputChange('intermediary', e.target.value)} /></div>
                    <div className="md:col-span-2 space-y-1.5"><Label>العملة</Label>
                        <Select value={currentEntry.originalCurrency} onValueChange={(val) => handleInputChange('originalCurrency', val as Currency)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{currencyOptions.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2 space-y-1.5"><Label>{currentEntry.type === 'payment' ? 'المبلغ المدفوع' : 'المبلغ المستلم'}</Label><NumericInput placeholder="المبلغ" value={currentEntry.originalAmount} onValueChange={(val) => handleInputChange('originalAmount', val || "")} /></div>
                    <div className={cn("md:col-span-2 space-y-1.5", currentEntry.originalCurrency === 'USD' && 'invisible')}><Label>سعر الصرف</Label><NumericInput placeholder="سعر الصرف" value={currentEntry.rate} onValueChange={(val) => handleInputChange('rate', val || "")} /></div>
                    {currentEntry.originalCurrency !== 'USD' && (
                        <div className="md:col-span-3 space-y-1.5">
                            <Label>المعادل بالدولار</Label>
                            <Input value={amountInUSD.toFixed(2)} readOnly disabled className="font-mono text-right"/>
                        </div>
                    )}
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,100px] gap-3 items-end">
                    <div className="space-y-1.5"><Label>ملاحظة</Label><Input placeholder="ملاحظة" value={currentEntry.note} onChange={(e) => handleInputChange('note', e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>التاريخ</Label>
                         <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !currentEntry.date && "text-muted-foreground")}>
                                    {currentEntry.date ? format(new Date(currentEntry.date), "yyyy-MM-dd") : <span>اختر تاريخ</span>}
                                    <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={new Date(currentEntry.date)}
                                    onSelect={(d) => {if(d) handleInputChange('date', format(d, 'yyyy-MM-dd')); setIsCalendarOpen(false);}}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleAddOrUpdateEntry} className="w-full">
                        {editingId ? <Save className="me-2 h-4 w-4"/> : <PlusCircle className="me-2 h-4 w-4" />}
                        {editingId ? 'تحديث' : 'إضافة'}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className="flex-grow flex flex-col">
             <CardHeader>
                <CardTitle className="text-lg">التسديدات المضافة ({stagedEntries.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
                 <div className="border rounded-md">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead className="w-[80px]">النوع</TableHead>
                            <TableHead>الطرف</TableHead>
                            <TableHead>الوسيط</TableHead>
                            <TableHead>المبلغ الأصلي</TableHead>
                            <TableHead>سعر الصرف</TableHead>
                            <TableHead>المعادل بالدولار</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>ملاحظات</TableHead>
                            <TableHead className="w-24 text-center">الإجراءات</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {stagedEntries.length === 0 && <TableRow><TableCell colSpan={9} className="h-24 text-center">لم تتم إضافة أي تسديدات بعد.</TableCell></TableRow>}
                            {stagedEntries.map(row => {
                                const amountInUSD = row.originalCurrency === 'USD' ? Number(row.originalAmount) : Number(row.originalAmount) / (Number(row.rate) || 1);
                                const signedAmount = row.type === 'receipt' ? -amountInUSD : amountInUSD;
                                return (
                                <TableRow key={row.id} className={cn("bg-background", editingId === row.id && 'bg-primary/10')}>
                                    <TableCell><Badge variant={row.type === 'receipt' ? 'default' : 'destructive'} className={cn(row.type === 'payment' ? 'bg-blue-500' : 'bg-green-500')}>{row.type === 'receipt' ? 'قبض' : 'دفع'}</Badge></TableCell>
                                    <TableCell className="font-semibold">{row.paidTo}</TableCell>
                                    <TableCell>{row.intermediary}</TableCell>
                                    <TableCell className="font-mono text-right">{Number(row.originalAmount).toLocaleString()} {row.originalCurrency}</TableCell>
                                    <TableCell className="font-mono text-right">{row.originalCurrency !== 'USD' ? row.rate : '-'}</TableCell>
                                    <TableCell className="font-mono font-bold text-right">{signedAmount.toFixed(2)} USD</TableCell>
                                    <TableCell>{row.date}</TableCell>
                                    <TableCell>{row.note}</TableCell>
                                    <TableCell className="text-center">
                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEdit(row)}><Edit className="h-4 w-4" /></Button>
                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeEntry(row.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
});
AddPaymentsForm.displayName = 'AddPaymentsForm';
export default AddPaymentsForm;
