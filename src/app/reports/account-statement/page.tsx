"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Search, FileText, Filter, ExternalLink, Users, Wallet, Building2, TrendingUp, TrendingDown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc } from "firebase/firestore";
import { format, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DatePicker } from "@/components/ui/date-picker";

const moduleTranslations: { [key: string]: string } = {
    visa: "فيزا",
    ticket: "تذكرة طيران",
    subscription: "اشتراك",
    segment: "سكمنت",
    exchange: "بورصة",
    profit: "توزيع أرباح",
    expense: "مصروف",
    box: "حركة صندوق",
    manual: "يدوي",
    payment: "دفعة",
};

// The unified account ID for all client-related receivable transactions
const CUSTOMER_DEBT_ACCOUNT_ID = "QmqPujiHb8fo68jb4MbP"; 

// Function to correctly pluralize collection names
const getCollectionName = (sourceType: string) => {
    if (!sourceType) return null;
    if (sourceType.endsWith('s')) return sourceType; // Already plural
    if (sourceType === 'exchange') return 'exchanges';
    return `${sourceType}s`;
}

export default function AccountStatementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [accountType, setAccountType] = useState("relation");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [transactionType, setTransactionType] = useState("all");

  const [dataSources, setDataSources] = useState<Record<string, any[]>>({
    relations: [],
    boxes: [],
    accounts: [],
    companies: [],
    users: [],
  });

  // CRITICAL FIX: Set a default date range to prevent unbounded queries and UI freezing.
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
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
    ...Object.entries(moduleTranslations).map(([value, label]) => ({ value, label }))
  ];

  useEffect(() => {
    async function fetchData() {
      setIsDataLoading(true);
      try {
        const [relationsSnap, boxesSnap, accountsSnap, companiesSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "boxes")),
          getDocs(collection(db, "accounts")),
          getDocs(collection(db, "exchanges")),
          getDocs(collection(db, "users")),
        ]);
        setDataSources({
          relations: relationsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          boxes: boxesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          accounts: accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          companies: companiesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          users: usersSnap.docs.map((d) => ({ id: d.id, ...d.data() as { displayName?: string } })),
        });
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setIsDataLoading(false);
      }
    }
    fetchData();
  }, []);

  const usersMap = useMemo(() => {
      const map = new Map<string, string>();
      dataSources.users.forEach(user => {
          if(user.displayName) {
              map.set(user.id, user.displayName);
          }
      });
      map.set('migration-script', 'سكريبت الترحيل'); // Add fallback for special cases
      return map;
  }, [dataSources.users]);

  useEffect(() => {
    setSelectedEntityId("");
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
    if (!selectedEntityId || !dateRange.from || !dateRange.to) return;
    
    setIsLoading(true);
    setEntries([]);
    setSummary({ debit: 0, credit: 0, balance: 0 });

    const vouchersRef = collection(db, "journal-vouchers");
    const queryConstraints = [
        orderBy("date", "asc"),
        where("date", ">=", Timestamp.fromDate(startOfDay(dateRange.from))),
        where("date", "<=", Timestamp.fromDate(endOfDay(dateRange.to))),
    ];
    
    if (transactionType !== "all") {
        queryConstraints.push(where("sourceType", "==", transactionType));
    }
    
    const q = query(vouchersRef, ...queryConstraints);
    const snapshot = await getDocs(q);

    const entryPromises = snapshot.docs.map(async (voucherDoc) => {
      const v = voucherDoc.data();
      const date = v.date?.seconds ? new Date(v.date.seconds * 1000) : v.date;

      let isMatch = false;
      let accountIdToDisplay = selectedEntityId;
      
      if (accountType === 'relation') {
        accountIdToDisplay = CUSTOMER_DEBT_ACCOUNT_ID;
        const collectionName = getCollectionName(v.sourceType);

        if (collectionName && v.sourceId) {
            try {
                const hasCustomerAccount = [...(v.debitEntries || []), ...(v.creditEntries || [])].some((e:any) => e.accountId === CUSTOMER_DEBT_ACCOUNT_ID);

                if (hasCustomerAccount) {
                    const sourceDocRef = doc(db, collectionName, v.sourceId);
                    const sourceDocSnap = await getDoc(sourceDocRef);
                    if (sourceDocSnap.exists()) {
                        const sourceData = sourceDocSnap.data();
                        const clientIsPartner = sourceData.partners?.some((p:any) => p.partnerId === selectedEntityId);
                        if (sourceData.clientId === selectedEntityId || clientIsPartner) {
                            isMatch = true;
                        }
                    }
                }
            } catch (err) {
                 // Fallback for manual or other non-standard entries
                 const hasRelevantEntry = [...(v.debitEntries || []), ...(v.creditEntries || [])]
                    .some(e => e.accountId === CUSTOMER_DEBT_ACCOUNT_ID && e.description?.includes(selectedEntityId));
                 if(hasRelevantEntry) isMatch = true;
            }
        }
      } else { // For cash, company, expense, etc.
        isMatch = [...(v.debitEntries || []), ...(v.creditEntries || [])].some((e:any) => e.accountId === selectedEntityId);
      }

      if (!isMatch) return [];

      const relevantEntries: any[] = [];
      (v.debitEntries || []).forEach((e: any) => {
        if (e.accountId === accountIdToDisplay) {
          relevantEntries.push({ debit: e.amount || 0, credit: 0, description: e.description || v.notes || "—" });
        }
      });
      (v.creditEntries || []).forEach((e: any) => {
        if (e.accountId === accountIdToDisplay) {
          relevantEntries.push({ debit: 0, credit: e.amount || 0, description: e.description || v.notes || "—" });
        }
      });

      return relevantEntries.map(entry => ({
        id: voucherDoc.id,
        date: date ? format(new Date(date), "dd/MM/yyyy") : "-",
        invoiceId: v.voucherNo || v.sourceId || voucherDoc.id,
        notes: entry.description,
        module: v.sourceType || "N/A",
        user: v.createdBy,
        sourceRoute: v.sourceRoute,
        ...entry,
      }));
    });

    const resultsNested = await Promise.all(entryPromises);
    const results = resultsNested.flat();

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
    const selected = list.find((item) => item.id === selectedEntityId);
    return selected ? selected.name : selectedEntityId;
  }, [selectedEntityId, accountType, dataSources]);

  const currentOptions = optionsMap[accountType as keyof typeof optionsMap] || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="text-primary" /> كشف الحساب التحليلي</h1>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="text-primary"/> الفلاتر المتقدمة</CardTitle>
          <CardDescription>استخدم الفلاتر لعرض كشف حساب دقيق ومخصص.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">نوع الحساب</label>
              <Select onValueChange={setAccountType} value={accountType} disabled={isDataLoading || isLoading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{accountTypes.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}</SelectContent></Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">الحساب</label>
              <Autocomplete options={currentOptions} value={selectedEntityId} onValueChange={setSelectedEntityId} placeholder={isDataLoading ? 'جاري التحميل...' : `ابحث...`} disabled={isDataLoading || isLoading} />
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">نوع العملية</label>
              <Select onValueChange={setTransactionType} value={transactionType} disabled={isDataLoading || isLoading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{transactionTypes.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent></Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">من تاريخ</label>
              <DatePicker date={dateRange.from} setDate={(d) => setDateRange(prev => ({...prev, from: d}))} disabled={isDataLoading || isLoading} />
            </div>
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium">إلى تاريخ</label>
              <DatePicker date={dateRange.to} setDate={(d) => setDateRange(prev => ({...prev, to: d}))} disabled={isDataLoading || isLoading} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={loadStatement} disabled={isLoading || isDataLoading || !selectedEntityId}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري...</> : <><Search className="mr-2 h-4 w-4" /> عرض الكشف</>}</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
          <Card><CardContent className="py-8"><div className="text-center text-muted-foreground"><Loader2 className="animate-spin h-5 w-5 inline mr-2" /> جاري جلب النتائج...</div></CardContent></Card>
      )}

      {!isLoading && selectedEntityId && entries.length > 0 && (
        <>
          <Card>
            <CardHeader>
                <CardTitle>النتائج لـ: {selectedAccountName || "..."}</CardTitle>
                <CardDescription>تم العثور على {entries.length} حركة مالية مطابقة للمعايير المحددة.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>رقم الفاتورة</TableHead><TableHead>نوع العملية</TableHead><TableHead>الملاحظات</TableHead><TableHead>المستخدم</TableHead><TableHead className="text-right text-green-600">مدين</TableHead><TableHead className="text-right text-red-600">دائن</TableHead><TableHead>الإجراءات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {entries.map((e, i) => (
                      <TableRow key={`${e.id}-${i}`}>
                        <TableCell>{e.date}</TableCell>
                        <TableCell className="font-mono text-xs">{e.invoiceId}</TableCell>
                        <TableCell><span className="bg-muted px-2 py-1 rounded-md text-xs font-semibold">{moduleTranslations[e.module] || e.module}</span></TableCell>
                        <TableCell>{e.notes}</TableCell>
                        <TableCell>{usersMap.get(e.user) || e.user}</TableCell>
                        <TableCell className="font-mono text-right text-green-600">{e.debit.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-right text-red-600">{e.credit.toFixed(2)}</TableCell>
                        <TableCell>
                          {e.sourceRoute && (
                            <Link href={e.sourceRoute} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
      
      {!isLoading && selectedEntityId && entries.length === 0 && (
          <Card><CardContent className="py-8"><div className="text-center text-muted-foreground">لا توجد حركات للفترة والمعايير المحددة.</div></CardContent></Card>
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
