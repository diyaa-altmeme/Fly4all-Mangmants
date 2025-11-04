

'use server';

import { getDb } from '@/lib/firebase-admin';
import { Timestamp } from "firebase-admin/firestore";
import type { JournalVoucher, DebtsReportData, DebtsReportEntry, Client, JournalEntry, ReportTransaction, BookingEntry, VisaBookingEntry, Subscription, ReportInfo, Currency, StructuredDescription } from '@/lib/types';
import { getClients } from '@/app/relations/actions';
import { getUsers } from "../users/actions";
import { getBoxes } from '@/app/boxes/actions';
import { getSettings } from '@/app/settings/actions';
import { normalizeVoucherType } from "@/lib/accounting/voucher-types";

const normalizeToDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    const date = (value as any).toDate();
    return date instanceof Date ? date : null;
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as any).seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }
  return null;
};

const serializeDate = (value: unknown): string => {
  const asDate = normalizeToDate(value);
  return (asDate ?? new Date()).toISOString();
};

export async function getAccountStatement(filters: { accountId: string; dateFrom?: Date; dateTo?: Date; voucherType?: string[] }) {
  const db = await getDb();
  if (!db) {
      console.error("Database not available");
      throw new Error("Database connection is not available.");
  }
  const { accountId, dateFrom, dateTo, voucherType } = filters;

  try {
    const [users, clientsResult, boxes, settings] = await Promise.all([
      getUsers(),
      getClients({ all: true, includeInactive: true, relationType: 'all' }),
      getBoxes(),
      getSettings(),
    ]);
    const usersMap = new Map(users.map(u => [u.uid, u.name]));

    const clientsData = clientsResult.clients || [];
    const accountLabelMap = new Map<string, string>();
    clientsData.forEach((client) => {
      accountLabelMap.set(client.id, client.name);
    });
    (boxes || []).forEach((box) => {
      accountLabelMap.set(box.id, box.name);
    });

    const distributionSettings = (settings as any)?.voucherSettings?.distributed;
    const distributionChannels = (distributionSettings?.distributionChannels || []) as Array<{
      id: string;
      label: string;
      accountId?: string;
    }>;
    const distributionChannelLabel = new Map<string, string>();
    distributionChannels.forEach((channel) => {
      distributionChannelLabel.set(channel.id, channel.label);
      if (channel.accountId) {
        accountLabelMap.set(channel.accountId, channel.label);
      }
    });

    const allVouchersSnap = await db.collection('journal-vouchers').orderBy('date', 'asc').get();

    const openingBalances: Record<string, number> = {};
    const reportRows: any[] = [];

    allVouchersSnap.forEach(doc => {
        const v = doc.data() as JournalVoucher;
        if (v.isDeleted) return;

        const voucherDate = normalizeToDate(v.date) ?? normalizeToDate(v.createdAt) ?? new Date();

        const rawSourceType = v.originalData?.sourceType || v.sourceType || v.voucherType;
        const normalizedType = normalizeVoucherType(rawSourceType || v.voucherType);

        const processEntry = (entry: JournalEntry, type: 'debit' | 'credit') => {
            if (entry.accountId === accountId) {
                const amount = (type === 'debit' ? 1 : -1) * (entry.amount || 0);
                const currency = v.currency || 'USD';

                if (dateFrom && voucherDate < dateFrom) {
                    openingBalances[currency] = (openingBalances[currency] || 0) + amount;
                } else if ((!dateFrom || voucherDate >= dateFrom) && (!dateTo || voucherDate <= dateTo)) {

                    let description: string | StructuredDescription = entry.description || v.notes || '';
                    if (normalizedType === 'distributed_receipt') {
                        const baseCurrency = currency;
                        const totalAmount = Number(v.originalData?.totalAmount ?? entry.amount ?? 0);
                        const companyAmount = Number(v.originalData?.companyAmount ?? 0);
                        const formattedTotal = new Intl.NumberFormat('en-US').format(totalAmount);
                        const formattedCompany = new Intl.NumberFormat('en-US').format(companyAmount);
                        const clientName = accountLabelMap.get(v.originalData?.accountId || '') || v.originalData?.accountId || '';

                        const distributions = Object.entries(v.originalData?.distributions || {})
                            .map(([channelId, distData]: [string, any]) => {
                                const numericAmount = Number(distData?.amount || 0);
                                if (!numericAmount) return null;
                                const label = distributionChannelLabel.get(channelId)
                                    || accountLabelMap.get(channelId)
                                    || channelId;
                                const formattedAmount = new Intl.NumberFormat('en-US').format(numericAmount);
                                return {
                                    name: label,
                                    amount: `${formattedAmount} ${distData?.currency || baseCurrency}`,
                                };
                            })
                            .filter(Boolean) as { name: string; amount: string }[];

                        description = {
                            title: clientName ? `سند قبض موزع من ${clientName}` : 'سند قبض موزع',
                            totalReceived: `الإجمالي: ${formattedTotal} ${baseCurrency}`,
                            selfReceipt: companyAmount > 0 ? `سداد للدافع: ${formattedCompany} ${baseCurrency}` : undefined,
                            distributions,
                            notes: v.notes || '',
                        };
                    }

                    reportRows.push({
                        id: `${doc.id}_${type}_${Math.random()}`,
                        date: voucherDate.toISOString(),
                        invoiceNumber: v.invoiceNumber,
                        description: description,
                        debit: type === 'debit' ? entry.amount || 0 : 0,
                        credit: type === 'credit' ? entry.amount || 0 : 0,
                        currency: currency,
                        officer: usersMap.get(v.createdBy) || v.officer || v.createdBy,
                        voucherType: normalizedType,
                        normalizedType,
                        rawVoucherType: v.voucherType,
                        sourceType: normalizedType,
                        rawSourceType,
                        sourceId: v.originalData?.sourceId || doc.id,
                        sourceRoute: v.originalData?.sourceRoute,
                        originalData: v.originalData,
                        notes: entry.description || v.notes || '',
                        direction: type,
                        amount: entry.amount || 0,
                        type: normalizedType,
                        accountId: entry.accountId,
                        createdAt: serializeDate(v.createdAt),
                    });
                }
            }
        };

        (v.debitEntries || []).forEach(entry => processEntry(entry, 'debit'));
        (v.creditEntries || []).forEach(entry => processEntry(entry, 'credit'));
    });
    

    const filteredRows = voucherType && voucherType.length > 0
        ? reportRows.filter(r => {
            const typeKey = r.normalizedType || r.sourceType || r.voucherType || r.type;
            return typeKey ? voucherType.includes(typeKey) : false;
        })
        : reportRows;

    const runningBalances: Record<string, number> = { ...openingBalances };
    
    const result = filteredRows
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((r: any) => {
            const currency = r.currency || 'USD';
            const previousBalance = runningBalances[currency] ?? 0;
            const nextBalance = previousBalance + (r.debit || 0) - (r.credit || 0);
            runningBalances[currency] = nextBalance;

            const balancesSnapshot = { ...runningBalances };

            return {
                ...r,
                balance: nextBalance,
                balancesByCurrency: balancesSnapshot,
                balanceUSD: balancesSnapshot['USD'] ?? 0,
                balanceIQD: balancesSnapshot['IQD'] ?? 0,
            };
        });

    return { transactions: result, openingBalances };

  } catch (err: any) {
    console.error('❌ Error loading account statement:', err.message);
    if (err.code === 9 || err.code === 'FAILED_PRECONDITION' || (err.message && err.message.includes('requires an index'))) { 
      const urlMatch = err.message.match(/(https?:\/\/[^\s)\]]+)/);
      const indexUrl = urlMatch ? urlMatch[0] : null;
      
      const userMessage = `فشل تحميل كشف الحساب: يتطلب الاستعلام فهرسًا مركبًا في Firestore.`;
      
      if (indexUrl) {
        throw new Error(`FIRESTORE_INDEX_URL::${indexUrl}`);
      } else {
         throw new Error(`${userMessage} يرجى مراجعة سجلات الخادم للحصول على الرابط وإنشاء الفهرس المطلوب.`);
      }
    }
    throw new Error(`فشل تحميل كشف الحساب: ${err.message}`);
  }
}

export async function getClientTransactions(clientId: string) {
    const { transactions, openingBalances } = await getAccountStatement({ accountId: clientId });
    
    let totalSales = 0;
    let paidAmount = 0;
    let totalProfit = 0;

    transactions.forEach(tx => {
        if(tx.sourceType === 'booking' || tx.sourceType === 'visa' || tx.sourceType === 'subscription') {
             totalSales += tx.debit;
             if (tx.originalData) {
                 const sale = tx.originalData.salePrice || (tx.originalData.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice || 0), 0);
                 const purchase = tx.originalData.purchasePrice || (tx.originalData.passengers || []).reduce((acc: number, p: any) => acc + (p.purchasePrice || 0), 0);
                 totalProfit += sale - purchase;
             }
        } else if (tx.sourceType === 'standard_receipt' || tx.sourceType === 'payment') {
            paidAmount += tx.credit;
        }
    });

    const dueAmount = totalSales - paidAmount;

    return { 
        transactions: transactions.map(tx => ({...tx, id: tx.id || tx.invoiceNumber})),
        totalSales,
        paidAmount,
        dueAmount,
        totalProfit,
        currency: 'USD' as Currency,
    };
}


export async function getDebtsReportData(): Promise<DebtsReportData> {
    const db = await getDb();
    if (!db) return { entries: [], summary: { totalDebitUSD: 0, totalCreditUSD: 0, balanceUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0, balanceIQD: 0 } };

    const { clients } = await getClients({ all: true, includeInactive: false });
    const vouchersSnap = await db.collection("journal-vouchers").get();

    const balances: Record<string, { balanceUSD: number; balanceIQD: number; lastTransaction: string | null }> = {};

    clients.forEach(client => {
        balances[client.id] = { balanceUSD: 0, balanceIQD: 0, lastTransaction: null };
    });
    
    const sortedVouchers = vouchersSnap.docs.sort((a, b) => {
        const dateA = a.data().date;
        const dateB = b.data().date;
        return new Date(dateA).getTime() - new Date(b.date).getTime();
    });

    sortedVouchers.forEach(doc => {
        const v = doc.data() as JournalVoucher;
        if(v.isDeleted) return;

        const processEntries = (entries: LegacyJournalEntry[], isDebit: boolean) => {
            (entries || []).forEach(entry => {
                if (balances[entry.accountId]) {
                    const amount = isDebit ? entry.amount : -entry.amount;
                    if (v.currency === 'USD') {
                        balances[entry.accountId].balanceUSD += amount;
                    } else if (v.currency === 'IQD') {
                        balances[entry.accountId].balanceIQD += amount;
                    }

                    if (!balances[entry.accountId].lastTransaction || v.date > balances[entry.accountId].lastTransaction!) {
                        balances[entry.accountId].lastTransaction = v.date;
                    }
                }
            });
        };

        processEntries(v.debitEntries || [], true);
        processEntries(v.creditEntries || [], false);
    });

    const entries = clients.map((client: Client): DebtsReportEntry => ({
        id: client.id,
        name: client.name,
        code: client.code,
        phone: client.phone,
        accountType: client.relationType,
        balanceUSD: balances[client.id]?.balanceUSD || 0,
        balanceIQD: balances[client.id]?.balanceIQD || 0,
        lastTransaction: balances[client.id]?.lastTransaction || null,
    }));
    
    const summary = entries.reduce((acc, entry) => {
        const balanceUSD = entry.balanceUSD || 0;
        const balanceIQD = entry.balanceIQD || 0;
        
         if ((entry.accountType === 'client' || entry.accountType === 'both')) {
            if (balanceUSD > 0) acc.totalCreditUSD += balanceUSD; else acc.totalDebitUSD -= balanceUSD;
        } else { // Supplier
            if (balanceUSD < 0) acc.totalCreditUSD -= balanceUSD; else acc.totalDebitUSD += balanceUSD;
        }
         if ((entry.accountType === 'client' || entry.accountType === 'both')) {
            if (balanceIQD > 0) acc.totalCreditIQD += balanceIQD; else acc.totalDebitIQD -= balanceIQD;
        } else { // Supplier
            if (balanceIQD < 0) acc.totalCreditIQD -= balanceIQD; else acc.totalDebitIQD += balanceIQD;
        }
        
        return acc;
    }, { totalDebitUSD: 0, totalCreditUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0 });

    return {
        entries,
        summary: {
            ...summary,
            balanceUSD: summary.totalCreditUSD - summary.totalDebitUSD,
            balanceIQD: summary.totalCreditIQD - summary.totalDebitIQD,
        }
    };
}
