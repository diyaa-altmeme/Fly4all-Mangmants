

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
import { saveTransactions } from '../actions';
import type { ExchangeTransaction, Currency, Exchange, UnifiedLedgerEntry } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

type Row = {
  id: string;
  partyName: string;
  originalCurrency: Currency;
  originalAmount: number | "";
  rate: number | "";
  date: string;
  note: string;
};

const LAST_EXCHANGE_RATE_KEY = 'lastExchangeRate';
const LAST_EXCHANGE_CURRENCY_KEY = 'lastExchangeCurrency';

interface AddTransactionsFormProps {
  exchangeId: string;
  exchanges: Exchange[];
  onSuccess: (newBatch: UnifiedLedgerEntry) => void;
  isEditing?: boolean;
  initialData?: any[];
  batchId?: string;
  onStagedEntriesChange: (count: number) => void;
  onSummaryChange: (summary: Record<string, number>) => void;
}

const AddTransactionsForm = forwardRef(({ exchangeId: initialExchangeId, exchanges, onSuccess, isEditing = false, initialData = [], batchId, onStagedEntriesChange, onSummaryChange }: AddTransactionsFormProps, ref) => {
  const { data: navData } = useVoucherNav();
  const { toast } = useToast();
  const [stagedEntries, setStagedEntries] = useState<Row[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentExchangeId, setCurrentExchangeId] = useState(initialExchangeId);

  const defaultCurrency = navData?.settings?.currencySettings?.defaultCurrency || 'USD';

  const getEmptyEntry = (): Omit<Row, 'id'> => ({
    partyName: "",
    originalCurrency: (localStorage.getItem(LAST_EXCHANGE_CURRENCY_KEY) as Currency) || (defaultCurrency as Currency),
    originalAmount: "",
    rate: parseFloat(localStorage.getItem(LAST_EXCHANGE_RATE_KEY) || String(navData?.settings?.currencySettings?.exchangeRates['USD_IQD'] || 1)),
    date: new Date().toISOString().slice(0, 10),
    note: ""
  });
  
  const [currentEntry, setCurrentEntry] = useState<Omit<Row, 'id'>>(getEmptyEntry());
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    onStagedEntriesChange(stagedEntries.length);
  }, [stagedEntries, onStagedEntriesChange]);
  
  const summary = useMemo(() => {
    const totals = stagedEntries.reduce((acc, entry) => {
        const currency = entry.originalCurrency;
        const amount = Number(entry.originalAmount) || 0;
        const signedAmount = -amount; // All transactions are debt

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
    if (isEditing) {
      setStagedEntries(initialData.map(item => ({
        id: item.id || uuidv4(),
        partyName: item.partyName || '',
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
    if (!currentEntry.partyName || !currentEntry.originalAmount) {
        toast({ title: 'بيانات ناقصة', description: 'الرجاء إدخال اسم الطرف والمبلغ.', variant: 'destructive'});
        return;
    }
    
    if (editingId) {
        setStagedEntries(prev => prev.map(entry => entry.id === editingId ? { ...currentEntry, id: editingId } : entry));
        setEditingId(null);
        toast({ title: "تم تحديث المعاملة" });
    } else {
        setStagedEntries(prev => [...prev, { id: uuidv4(), ...currentEntry }]);
    }
    
    if(currentEntry.rate) {
        localStorage.setItem(LAST_EXCHANGE_RATE_KEY, String(currentEntry.rate));
    }
    if(currentEntry.originalCurrency) {
        localStorage.setItem(LAST_EXCHANGE_CURRENCY_KEY, currentEntry.originalCurrency);
    }
    
    setCurrentEntry(prev => ({
        ...getEmptyEntry(),
        rate: prev.rate,
        date: prev.date,
        originalCurrency: prev.originalCurrency
    }));
  };

  const handleEdit = (entry: Row) => {
    setEditingId(entry.id);
    setCurrentEntry({
        partyName: entry.partyName,
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
        partyName: r.partyName,
        originalCurrency: r.originalCurrency,
        originalAmount: Number(r.originalAmount), 
        rate: Number(r.rate) || 1, 
        date: r.date, 
        note: r.note,
      }));
      const result = await saveTransactions(currentExchangeId, payload, batchId);
      if (!result.success || !result.batch) throw new Error(result.error);
      toast({ title: `تم ${isEditing ? 'تحديث' : 'حفظ'} المعاملات بنجاح` });
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
                <CardTitle className="text-lg">{editingId ? `تعديل معاملة` : 'إضافة معاملة جديدة للقائمة'}</CardTitle>
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
                    <div className="md:col-span-4 space-y-1.5"><Label>الطرف</Label><Input placeholder="الطرف الآخر في المعاملة" value={currentEntry.partyName} onChange={(e) => handleInputChange('partyName', e.target.value)} /></div>
                    <div className="md:col-span-2 space-y-1.5"><Label>العملة</Label>
                        <Select value={currentEntry.originalCurrency} onValueChange={(val) => handleInputChange('originalCurrency', val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{currencyOptions.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2 space-y-1.5"><Label>المبلغ</Label><NumericInput placeholder="المبلغ" value={currentEntry.originalAmount} onValueChange={(val) => handleInputChange('originalAmount', val || "")} /></div>
                    <div className={cn("md:col-span-2 space-y-1.5", currentEntry.originalCurrency === 'USD' && 'invisible')}><Label>سعر الصرف</Label><NumericInput placeholder="سعر الصرف" value={currentEntry.rate} onValueChange={(val) => handleInputChange('rate', val || "")} /></div>
                    {currentEntry.originalCurrency !== 'USD' && (
                        <div className="md:col-span-2 space-y-1.5">
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
                <CardTitle className="text-lg">المعاملات المضافة ({stagedEntries.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
                 <div className="border rounded-md">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>الطرف</TableHead>
                            <TableHead>المبلغ الأصلي</TableHead>
                            <TableHead>سعر الصرف</TableHead>
                            <TableHead>المعادل بالدولار</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>ملاحظات</TableHead>
                            <TableHead className="w-24 text-center">الإجراءات</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {stagedEntries.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center">لم تتم إضافة أي معاملات بعد.</TableCell></TableRow>}
                            {stagedEntries.map(row => {
                                const amountInUSD = row.originalCurrency === 'USD' ? Number(row.originalAmount) : Number(row.originalAmount) / (Number(row.rate) || 1);
                                const signedAmount = -amountInUSD;
                                return (
                                <TableRow key={row.id} className={cn(editingId === row.id && 'bg-primary/10')}>
                                    <TableCell className="font-semibold">{row.partyName}</TableCell>
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
AddTransactionsForm.displayName = 'AddTransactionsForm';
export default AddTransactionsForm;
