"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Search, FileText, Filter, Layers, TrendingUp, TrendingDown, Users, Wallet, Building2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { format, startOfDay, endOfDay } from "date-fns";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DatePicker } from "@/components/ui/date-picker";

export default function AccountStatementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [accountType, setAccountType] = useState("relation");
  const [accountId, setAccountId] = useState("");
  const [transactionType, setTransactionType] = useState("all");

  const [dataSources, setDataSources] = useState<Record<string, any[]>>({
    relations: [],
    boxes: [],
    accounts: [],
    companies: [],
  });

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [summary, setSummary] = useState({ debit: 0, credit: 0, balance: 0 });

  const accountTypes = [
    { value: "relation", label: "العلاقات (عميل / مورد)", icon: Users },
    { value: "cash", label: "الصناديق النقدية", icon: Wallet },
    { value: "revenue", label: "الإيرادات", icon: TrendingUp },
    { value: "expense", label: "المصاريف", icon: TrendingDown },
    { value: "company", label: "الشركات", icon: Building2 },
  ];

  const transactionTypes = [
    { value: "all", label: "كل العمليات" },
    { value: "visa", label: "الفيزا" },
    { value: "ticket", label: "تذاكر الطيران" },
    { value: "subscription", label: "الاشتراكات" },
    { value: "segment", label: "السكمنت" },
    { value: "exchange", label: "البورصات" },
    { value: "profit", label: "توزيع الأرباح" },
    { value: "expense", label: "المصاريف" },
    { value: "box", label: "حركات الصندوق" },
  ];

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [relationsSnap, boxesSnap, accountsSnap, companiesSnap] = await Promise.all([
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "boxes")),
          getDocs(collection(db, "chart-of-accounts")),
          getDocs(collection(db, "exchanges")),
        ]);
        setDataSources({
          relations: relationsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          boxes: boxesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          accounts: accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          companies: companiesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        });
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    setAccountId("");
    setEntries([]);
    setSummary({ debit: 0, credit: 0, balance: 0 });
  }, [accountType]);

  const optionsMap = useMemo(() => ({
    relation: dataSources.relations.map(r => ({ value: r.id, label: r.name })),
    cash: dataSources.boxes.map(b => ({ value: b.id, label: b.name })),
    revenue: dataSources.accounts.filter(a => a.type === 'revenue').map(a => ({ value: a.id, label: a.name })),
    expense: dataSources.accounts.filter(a => a.type === 'expense').map(a => ({ value: a.id, label: a.name })),
    company: dataSources.companies.map(c => ({ value: c.id, label: c.name })),
  }), [dataSources]);

  async function loadStatement() {
    if (!accountId) return;
    setIsLoading(true);

    const vouchersRef = collection(db, "journal-vouchers");
    const q = query(vouchersRef, orderBy("date", "asc"));
    const snapshot = await getDocs(q);

    let runningBalance = 0;
    const results = snapshot.docs.flatMap(doc => {
      const v = doc.data();
      const date = v.date?.seconds ? new Date(v.date.seconds * 1000) : null;
      
      if (!date || (dateRange.from && date < startOfDay(dateRange.from)) || (dateRange.to && date > endOfDay(dateRange.to))) {
        return [];
      }
      
      if (transactionType !== "all" && v.module !== transactionType) {
        return [];
      }

      return (v.entries || []).map((e: any) => {
        if (e.accountId === accountId) {
          const debit = e.debit || 0;
          const credit = e.credit || 0;
          runningBalance += (debit - credit);
          return {
            id: doc.id,
            date: date ? format(date, "dd/MM/yyyy") : "-",
            ref: v.voucherNo || doc.id,
            module: v.module || "N/A",
            description: e.description || v.notes || "—",
            debit,
            credit,
            balance: runningBalance,
          };
        }
        return null;
      }).filter(Boolean);
    });
    
    const totalDebit = results.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = results.reduce((sum, item) => sum + item.credit, 0);

    setEntries(results);
    setSummary({ debit: totalDebit, credit: totalCredit, balance: totalDebit - totalCredit });
    setIsLoading(false);
  }

  const selectedAccountName = useMemo(() => {
    const list = 
      accountType === 'relation' ? dataSources.relations :
      accountType === 'cash' ? dataSources.boxes :
      accountType === 'company' ? dataSources.companies :
      ['revenue', 'expense'].includes(accountType) ? dataSources.accounts : [];
    const selected = list.find((item) => item.id === accountId);
    return selected ? selected.name : accountId;
  }, [accountId, accountType, dataSources]);

  const currentOptions = optionsMap[accountType as keyof typeof optionsMap];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="text-primary" /> كشف الحساب التحليلي
        </h1>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="text-primary"/> الفلاتر المتقدمة</CardTitle>
          <CardDescription>استخدم الفلاتر لعرض كشف حساب دقيق ومخصص.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">نوع الحساب</label>
              <Select onValueChange={setAccountType} value={accountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accountTypes.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">الحساب</label>
              <Autocomplete options={currentOptions || []} value={accountId} onValueChange={setAccountId} placeholder={`ابحث عن ${accountTypes.find(a => a.value === accountType)?.label}...`} />
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">نوع العملية</label>
              <Select onValueChange={setTransactionType} value={transactionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">من تاريخ</label>
              <DatePicker date={dateRange.from} setDate={(d) => setDateRange(prev => ({...prev, from: d}))} />
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">إلى تاريخ</label>
              <DatePicker date={dateRange.to} setDate={(d) => setDateRange(prev => ({...prev, to: d}))} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={loadStatement} disabled={isLoading || !accountId}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري...</> : <><Search className="mr-2 h-4 w-4" /> عرض الكشف</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {accountId && (
        <>
          <Card>
            <CardHeader>
                <CardTitle>النتائج لـ: {selectedAccountName || "..."}</CardTitle>
                <CardDescription>تم العثور على {entries.length} حركة مالية مطابقة.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8"><Loader2 className="animate-spin h-5 w-5 inline mr-2" /> جاري جلب النتائج...</div>
              ) : entries.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">لا توجد حركات للفترة المحددة.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>المرجع</TableHead><TableHead>نوع العملية</TableHead><TableHead>الوصف</TableHead><TableHead className="text-right text-green-600">مدين</TableHead><TableHead className="text-right text-red-600">دائن</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {entries.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>{e.date}</TableCell>
                          <TableCell>{e.ref}</TableCell>
                          <TableCell><span className="bg-muted px-2 py-1 rounded-md text-xs">{e.module}</span></TableCell>
                          <TableCell>{e.description}</TableCell>
                          <TableCell className="font-mono text-right text-green-600">{e.debit.toFixed(2)}</TableCell>
                          <TableCell className="font-mono text-right text-red-600">{e.credit.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-t-4 border-primary">
            <CardHeader><CardTitle>الملخص المالي</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <SummaryBox title="إجمالي مدين" value={summary.debit} color="text-green-600" />
              <SummaryBox title="إجمالي دائن" value={summary.credit} color="text-red-600" />
              <SummaryBox title="الرصيد النهائي" value={summary.balance} color={summary.balance >= 0 ? "text-blue-600" : "text-orange-600"} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryBox({ title, value, color }: any) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}</div>
    </div>
  );
}
