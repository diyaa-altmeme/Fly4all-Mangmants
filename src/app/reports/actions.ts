

'use server';

import type { ReportInfo, AccountType, ReportTransaction, Currency, DebtsReportData, Client, Supplier, AppSettings, Box, StructuredDescription, BookingEntry, VisaBookingEntry, Subscription, JournalVoucher, JournalEntry, DebtsReportEntry, InvoiceReportItem, ClientTransactionSummary, TreeNode, Exchange } from '@/lib/types';
import { getDb } from '@/lib/firebase-admin';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '../suppliers/actions';
import { getBoxes } from '../boxes/actions';
import { getSettings } from '@/app/settings/actions';
import { getSubscriptions } from '../subscriptions/actions';
import { FieldValue } from 'firebase-admin/firestore';
import { cache } from 'react';
import { getUsers } from '../users/actions';
import { getBookings } from '../bookings/actions';
import { getVisaBookings } from '../visas/actions';
import { getAllVouchers } from '../accounts/vouchers/list/actions';
import { getExchanges } from '../exchanges/actions';

const formatCurrencyDisplay = (amount: number, currency: string) => {
    const formattedAmount = new Intl.NumberFormat('en-US').format(Math.abs(amount));
    return `${amount < 0 ? `(${formattedAmount})` : formattedAmount} ${currency}`;
};

const getVoucherTypeLabel = (type: string) => {
    switch(type) {
        case 'journal_from_standard_receipt': return 'سند قبض عادي';
        case 'journal_from_distributed_receipt': return 'سند قبض مخصص';
        case 'journal_from_payment': return 'سند دفع';
        case 'journal_from_expense': return 'سند مصاريف';
        case 'journal_voucher': return 'قيد محاسبي';
        case 'journal_from_remittance': return 'حوالة مستلمة';
        case 'booking': return 'حجز طيران';
        case 'visa': return 'طلب فيزا';
        case 'refund': return 'استرجاع تذكرة';
        case 'exchange': return 'تغيير تذكرة';
        case 'void': return 'إلغاء (فويد)';
        case 'exchange_transaction': return 'معاملة بورصة';
        case 'exchange_payment': return 'تسديد بورصة';
        default: return type;
    }
};

const buildDetailedBookingDescription = (booking: BookingEntry): StructuredDescription => {
    return {
        title: `حجز طيران PNR: ${booking.pnr}`,
        totalReceived: `فاتورة رقم: ${booking.invoiceNumber}`,
        selfReceipt: booking.route, 
        distributions: (booking.passengers || []).map(p => ({
            name: `${p.name} (${p.passengerType})`,
            amount: `تذكرة: ${p.ticketNumber} | جواز: ${p.passportNumber || '-'}`,
        })),
        notes: booking.notes || '',
    };
};

const buildDetailedVisaDescription = (booking: VisaBookingEntry): StructuredDescription => {
    return {
        title: `طلب فيزا - فاتورة رقم: ${booking.invoiceNumber}`,
        totalReceived: ``, 
        selfReceipt: null,
        distributions: (booking.passengers || []).map(p => ({
            name: `${p.name} (نوع الفيزا: ${p.visaType})`,
            amount: `رقم الطلب: ${p.applicationNumber} | جواز: ${p.passportNumber || '-'}`,
        })),
        notes: booking.notes || '',
    };
};

const buildDetailedDistributedReceiptDescription = async (voucher: JournalVoucher, accountsMap: Map<string, string>): Promise<StructuredDescription> => {
    const originalData = voucher.originalData;
    
    if (!originalData) {
        return {
            title: `سند قبض مخصص - فاتورة: ${voucher.invoiceNumber || voucher.id.slice(0,6)}`,
            totalReceived: 'بيانات أصلية غير متاحة',
            selfReceipt: null,
            distributions: [],
            notes: voucher.notes || '',
        };
    }

    const appSettings = await getSettings();
    const distributedVoucherSettings = appSettings.voucherSettings?.distributed;

    const companyReceipt = originalData.companyAmount > 0 ? `تم تسديد ${formatCurrencyDisplay(originalData.companyAmount, voucher.currency)} من حساب ${accountsMap.get(originalData.accountId) || 'غير معروف'}` : null;
    
    const otherDistributions = Object.entries(originalData.distributions || {})
        .filter(([, distData]: [string, any]) => distData?.enabled && distData?.amount > 0)
        .map(([channelId, distData]: [string, any]) => {
            const channelSettings = distributedVoucherSettings?.distributionChannels?.find((c: any) => c.id === channelId);
            return {
                name: `توزيع إلى: ${channelSettings?.label || accountsMap.get(channelSettings?.accountId) || channelId}`,
                amount: formatCurrencyDisplay(Number(distData.amount), voucher.currency)
            };
        });

    return {
        title: `سند قبض مخصص من ${accountsMap.get(originalData.accountId)} - مرجع: ${originalData.reference || 'N/A'}`,
        totalReceived: `المبلغ الكلي المستلم: ${formatCurrencyDisplay(originalData.totalAmount || 0, voucher.currency)}`,
        selfReceipt: companyReceipt,
        distributions: otherDistributions,
        notes: originalData.notes || '',
    };
}


async function getTransactionsForAccount(accountId: string, accountsMap: Map<string, string>, settings: AppSettings, reportType: 'summary' | 'detailed'): Promise<ReportTransaction[]> {
    const transactions: ReportTransaction[] = [];
    const db = await getDb();
    if (!db) return [];

    // This is not efficient for very large datasets, but it's the most reliable way to query for this
    // without complex, pre-defined composite indexes for every possible query combination.
    // Firestore is not designed for complex relational queries like this.
    const journalSnapshot = await db.collection('journal-vouchers').get();
    
    const vouchers = journalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalVoucher));

    for (const voucher of vouchers) {
        const relevantDebit = voucher.debitEntries?.find((e: any) => e.accountId === accountId);
        const relevantCredit = voucher.creditEntries?.find((e: any) => e.accountId === accountId);
        
        if (!relevantDebit && !relevantCredit) continue;

        let description: string | StructuredDescription = voucher.notes;
        const voucherTypeLabel = getVoucherTypeLabel(voucher.voucherType);

        if (relevantDebit) {
            const creditedParties = voucher.creditEntries.map((e: any) => accountsMap.get(e.accountId) || e.accountId).join(', ');
            
            if (reportType === 'detailed' && voucher.voucherType === 'journal_from_distributed_receipt' && voucher.originalData) {
                description = await buildDetailedDistributedReceiptDescription(voucher, accountsMap);
            } else if(reportType === 'detailed' && voucher.voucherType === 'booking' && voucher.originalData) {
                description = buildDetailedBookingDescription(voucher.originalData);
            } else if(reportType === 'detailed' && voucher.voucherType === 'visa' && voucher.originalData) {
                 description = buildDetailedVisaDescription(voucher.originalData);
            }
             else {
                 description = `${voucher.notes || 'حركة مدينة'} (إلى: ${creditedParties})`;
            }

             transactions.push({
                id: `journal-${voucher.id}-debit`,
                invoiceNumber: voucher.invoiceNumber || 'N/A',
                date: voucher.date,
                description: description,
                type: voucherTypeLabel,
                debit: relevantDebit.amount,
                credit: 0, 
                balance: 0,
                currency: voucher.currency,
                otherParty: creditedParties,
                officer: voucher.officer,
            });
        }
        if (relevantCredit) {
             const debitedParties = voucher.debitEntries.map((e: any) => accountsMap.get(e.accountId) || e.accountId).join(', ');

             if (reportType === 'detailed' && voucher.voucherType === 'journal_from_distributed_receipt' && voucher.originalData) {
                description = await buildDetailedDistributedReceiptDescription(voucher, accountsMap);
            } else if(reportType === 'detailed' && voucher.voucherType === 'booking' && voucher.originalData) {
                description = buildDetailedBookingDescription(voucher.originalData);
            } else if(reportType === 'detailed' && voucher.voucherType === 'visa' && voucher.originalData) {
                description = buildDetailedVisaDescription(voucher.originalData);
            } else {
                 description = `${voucher.notes || 'حركة دائنة'} (من: ${debitedParties})`;
             }

             transactions.push({
                id: `journal-${voucher.id}-credit`,
                invoiceNumber: voucher.invoiceNumber || 'N/A',
                date: voucher.date,
                description: description,
                type: voucherTypeLabel,
                debit: 0, 
                credit: relevantCredit.amount,
                balance: 0,
                currency: voucher.currency,
                otherParty: debitedParties,
                officer: voucher.officer,
            });
        }
    }
    
    return transactions;
}


export const getAccountStatement = cache(async (params: { accountId: string, currency: Currency | 'both', dateRange: DateRange, reportType: 'summary' | 'detailed', transactionType?: 'profits' | 'expenses' }): Promise<ReportInfo> => {
    
    const db = await getDb();
    if (!db) throw new Error("Database not available.");
    
    let accountInfo: { id: string, name: string, type: AccountType } | null = null;
    
    const clientDoc = await db.collection('clients').doc(params.accountId).get();
    if (clientDoc.exists) {
        const data = clientDoc.data() as Client;
        accountInfo = { id: clientDoc.id, name: data.name, type: data.relationType };
    } else {
        const boxDoc = await db.collection('boxes').doc(params.accountId).get();
        if (boxDoc.exists) {
            const data = boxDoc.data() as Box;
            accountInfo = { id: boxDoc.id, name: data.name, type: 'box' };
        } else {
            const exchangeDoc = await db.collection('exchanges').doc(params.accountId).get();
             if (exchangeDoc.exists) {
                const data = exchangeDoc.data() as Exchange;
                accountInfo = { id: exchangeDoc.id, name: data.name, type: 'exchange' as AccountType };
            }
        }
    }
    
    const settings = await getSettings();
    if (!accountInfo) {
        const expenseAccount = settings.voucherSettings?.expenseAccounts?.find(a => a.id === params.accountId);
        if (expenseAccount) {
            accountInfo = { id: expenseAccount.id, name: expenseAccount.name, type: 'expense' };
        } else {
             throw new Error(`Account with ID ${params.accountId} not found.`);
        }
    }
    
    const [clientsRes, suppliers, boxes] = await Promise.all([
        getClients({ all: true }),
        getSuppliers({ all: true }),
        getBoxes(),
    ]);
    const accountsMap = new Map<string, string>();
    clientsRes.clients.forEach(c => accountsMap.set(c.id, c.name));
    suppliers.forEach(s => accountsMap.set(s.id, s.name));
    boxes.forEach(b => accountsMap.set(b.id, b.name));
    
    settings.voucherSettings?.distributed?.distributionChannels?.forEach(channel => {
        const existingName = accountsMap.get(channel.accountId);
        if (!existingName) {
            accountsMap.set(channel.accountId, channel.label);
        }
    });


    const allTransactions = await getTransactionsForAccount(accountInfo.id, accountsMap, settings, params.reportType);
    
    const interval = {
        start: params.dateRange.from ? startOfDay(params.dateRange.from) : new Date(0),
        end: params.dateRange.to ? endOfDay(params.dateRange.to) : new Date(8640000000000000)
    };

    const filteredByDate = allTransactions
        .filter(tx => {
            const date = parseISO(tx.date);
            const inInterval = isWithinInterval(date, interval);
            const currencyMatch = params.currency === 'both' || tx.currency === params.currency;
            return inInterval && currencyMatch;
        });

    let finalFilteredTransactions = filteredByDate;

    if (params.transactionType === 'profits') {
        finalFilteredTransactions = filteredByDate.filter(tx => tx.credit > 0);
    } else if (params.transactionType === 'expenses') {
        finalFilteredTransactions = filteredByDate.filter(tx => tx.debit > 0);
    }
        
    const sortedTransactions = finalFilteredTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const openingBalanceTransactions = allTransactions.filter(tx => parseISO(tx.date) < interval.start);
    
    const openingBalanceUSD = openingBalanceTransactions
      .filter(tx => tx.currency === 'USD')
      .reduce((acc, tx) => acc + tx.credit - tx.debit, 0);
      
    const openingBalanceIQD = openingBalanceTransactions
      .filter(tx => tx.currency === 'IQD')
      .reduce((acc, tx) => acc + tx.credit - tx.debit, 0);

    let runningBalanceUSD = openingBalanceUSD;
    let runningBalanceIQD = openingBalanceIQD;

    const finalTransactionsWithBalance = sortedTransactions.map(tx => {
        if (tx.currency === 'USD') {
            runningBalanceUSD += tx.credit - tx.debit;
            return { ...tx, balance: runningBalanceUSD };
        } else {
            runningBalanceIQD += tx.credit - tx.debit;
            return { ...tx, balance: runningBalanceIQD };
        }
    });

    const totalDebitUSD = sortedTransactions.filter(tx => tx.currency === 'USD').reduce((acc, tx) => acc + tx.debit, 0);
    const totalCreditUSD = sortedTransactions.filter(tx => tx.currency === 'USD').reduce((acc, tx) => acc + tx.credit, 0);
    const totalDebitIQD = sortedTransactions.filter(tx => tx.currency === 'IQD').reduce((acc, tx) => acc + tx.debit, 0);
    const totalCreditIQD = sortedTransactions.filter(tx => tx.currency === 'IQD').reduce((acc, tx) => acc + tx.credit, 0);

    return {
        title: `كشف حساب لـ: ${accountInfo.name}`,
        accountType: accountInfo.type as AccountType,
        openingBalanceUSD: openingBalanceUSD,
        openingBalanceIQD: openingBalanceIQD,
        transactions: finalTransactionsWithBalance,
        totalDebitUSD,
        totalCreditUSD,
        finalBalanceUSD: runningBalanceUSD,
        totalDebitIQD,
        totalCreditIQD,
        finalBalanceIQD: runningBalanceIQD,
        currency: params.currency,
        balanceMode: 'asset' // This should be determined based on account type
    };
});


export async function getDebtsReportData(): Promise<DebtsReportData> {
    const db = await getDb();
    if (!db) {
      return {
        entries: [],
        summary: { totalDebitUSD: 0, totalCreditUSD: 0, balanceUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0, balanceIQD: 0 }
      };
    }
  
    const clientsResult = await getClients({ all: true });
    
    const balances: { [key: string]: { USD: number, IQD: number, lastTransaction: string | null } } = {};
  
    const processEntry = (accountId: string, amount: number, currency: 'USD' | 'IQD', date: string, type: 'debit' | 'credit') => {
      if (!balances[accountId]) {
        balances[accountId] = { USD: 0, IQD: 0, lastTransaction: null };
      }
      
      const value = type === 'debit' ? amount : -amount;
      balances[accountId][currency] += value;
  
      if (!balances[accountId].lastTransaction || new Date(date) > new Date(balances[accountId].lastTransaction!)) {
        balances[accountId].lastTransaction = date;
      }
    };
  
    const journalSnapshot = await db.collection('journal-vouchers').get();
    journalSnapshot.forEach(doc => {
      const data = doc.data();
      const date = (data.createdAt?.toDate?.() || new Date(data.createdAt)).toISOString();
      (data.debitEntries || []).forEach((entry: any) => processEntry(entry.accountId, entry.amount, data.currency, date, 'debit'));
      (data.creditEntries || []).forEach((entry: any) => processEntry(entry.accountId, entry.amount, data.currency, date, 'credit'));
    });
  
    const entries: DebtsReportEntry[] = clientsResult.clients.map(client => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
      accountType: client.relationType || 'client',
      balanceUSD: balances[client.id]?.USD || 0,
      balanceIQD: balances[client.id]?.IQD || 0,
      lastTransaction: balances[client.id]?.lastTransaction || null,
    }));
  
    const summary = entries.reduce((acc, entry) => {
        const balanceUSD = entry.balanceUSD || 0;
        const balanceIQD = entry.balanceIQD || 0;
        
        if (entry.accountType === 'client' || entry.accountType === 'both') {
            if (balanceUSD > 0) acc.totalDebitUSD += balanceUSD; else acc.totalCreditUSD -= balanceUSD;
            if (balanceIQD > 0) acc.totalDebitIQD += balanceIQD; else acc.totalCreditIQD -= balanceIQD;
        } else { // Supplier
            if (balanceUSD < 0) acc.totalDebitUSD -= balanceUSD; else acc.totalCreditUSD += balanceUSD;
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
      },
    };
}

export async function getClientTransactions(clientId: string): Promise<ClientTransactionSummary> {
    const [bookings, visas, subscriptions, allVouchers, clients, suppliers, boxes, users, settings] = await Promise.all([
        getBookings({}),
        getVisaBookings(),
        getSubscriptions(),
        getAllVouchers([], [], [], [], await getSettings()),
        getClients({ all: true }),
        getSuppliers({ all: true }),
        getBoxes(),
        getUsers(),
        getSettings()
    ]);
    
    let totalSales = 0;
    let paidAmount = 0;
    let totalProfit = 0;
    const clientBookings = bookings.bookings.filter(b => b.clientId === clientId);
    const clientVisas = visas.filter(v => v.clientId === clientId);
    const clientSubscriptions = subscriptions.filter(s => s.clientId === clientId);

    const transactions: ReportTransaction[] = [];

    clientBookings.forEach(b => {
        const sale = b.passengers.reduce((sum, p) => sum + p.salePrice, 0);
        const cost = b.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);
        totalSales += sale;
        totalProfit += (sale - cost);
        transactions.push({ id: b.id, date: b.issueDate, type: 'حجز طيران', description: `PNR: ${b.pnr}`, debit: sale, credit: 0, balance: 0, currency: b.passengers[0]?.currency, invoiceNumber: b.invoiceNumber });
    });

    clientVisas.forEach(v => {
        const sale = v.passengers.reduce((sum, p) => sum + p.salePrice, 0);
        const cost = v.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);
        totalSales += sale;
        totalProfit += (sale - cost);
        transactions.push({ id: v.id, date: v.submissionDate, type: 'طلب فيزا', description: `لـ ${v.passengers[0].name}`, debit: sale, credit: 0, balance: 0, currency: v.currency, invoiceNumber: v.invoiceNumber });
    });

    clientSubscriptions.forEach(s => {
        totalSales += s.salePrice;
        totalProfit += s.profit;
        paidAmount += s.paidAmount;
        transactions.push({ id: s.id, date: s.purchaseDate, type: 'اشتراك', description: s.serviceName, debit: s.salePrice, credit: 0, balance: 0, currency: s.currency, invoiceNumber: s.id.slice(0, 6) });
    });

    allVouchers.filter(v => v.originalData?.from === clientId || v.originalData?.toSupplierId === clientId || v.originalData?.payeeId === clientId || v.originalData?.accountId === clientId).forEach(v => {
        if(v.voucherType.includes('receipt')) {
            paidAmount += v.totalAmount;
            transactions.push({ id: v.id, date: v.date, type: v.voucherTypeLabel || 'سند', description: v.notes || 'دفعة', debit: 0, credit: v.totalAmount || 0, balance: 0, currency: v.currency, invoiceNumber: v.invoiceNumber });
        } else if (v.voucherType.includes('payment')) {
            paidAmount -= v.totalAmount;
             transactions.push({ id: v.id, date: v.date, type: v.voucherTypeLabel || 'سند', description: v.notes || 'دفعة', debit: 0, credit: v.totalAmount || 0, balance: 0, currency: v.currency, invoiceNumber: v.invoiceNumber });
        }
    });

    const dueAmount = totalSales - paidAmount;
    
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
        totalSales,
        paidAmount,
        dueAmount,
        totalProfit,
        currency: 'USD',
        transactions
    };
}


// ===== Advanced Reports Actions =====

export interface ClientProfitReportEntry {
    clientId: string;
    clientName: string;
    totalBookings: number;
    totalSales: number;
    totalCost: number;
    totalProfit: number;
}

export const getClientProfitReport = cache(async (dateRange?: DateRange): Promise<ClientProfitReportEntry[]> => {
    const db = await getDb();
    if (!db) return [];

    const clients = (await getClients({ all: true })).clients;
    const clientProfits: { [key: string]: ClientProfitReportEntry } = {};

    clients.forEach(client => {
        clientProfits[client.id] = {
            clientId: client.id,
            clientName: client.name,
            totalBookings: 0,
            totalSales: 0,
            totalCost: 0,
            totalProfit: 0,
        };
    });

    const interval = dateRange?.from && dateRange.to 
        ? { start: dateRange.from, end: dateRange.to }
        : null;

    const bookingsSnap = await db.collection('bookings').get();
    bookingsSnap.forEach(doc => {
        const booking = doc.data() as BookingEntry;
        const entryDate = parseISO(booking.enteredAt || booking.issueDate);
        
        if (interval && !isWithinInterval(entryDate, interval)) return;
        
        if (booking.clientId && clientProfits[booking.clientId]) {
            const sale = booking.passengers.reduce((sum, p) => sum + p.salePrice, 0);
            const cost = booking.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);
            
            clientProfits[booking.clientId].totalBookings += 1;
            clientProfits[booking.clientId].totalSales += sale;
            clientProfits[booking.clientId].totalCost += cost;
            clientProfits[booking.clientId].totalProfit += (sale - cost);
        }
    });

    const visasSnap = await db.collection('visaBookings').get();
    visasSnap.forEach(doc => {
        const visa = doc.data() as VisaBookingEntry;
        const entryDate = parseISO(visa.enteredAt || visa.submissionDate);

        if (interval && !isWithinInterval(entryDate, interval)) return;

        if (visa.clientId && clientProfits[visa.clientId]) {
            const sale = visa.passengers.reduce((sum, p) => sum + p.salePrice, 0);
            const cost = visa.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);
            
            clientProfits[visa.clientId].totalBookings += 1;
            clientProfits[visa.clientId].totalSales += sale;
            clientProfits[visa.clientId].totalCost += cost;
            clientProfits[visa.clientId].totalProfit += (sale - cost);
        }
    });
    
    return Object.values(clientProfits)
        .filter(c => c.totalBookings > 0)
        .sort((a,b) => b.totalProfit - a.totalProfit);
});
  
export interface SupplierProfitReportEntry {
    supplierId: string;
    supplierName: string;
    totalTransactions: number;
    totalVolume: number;
    totalProfit: number;
}

export const getSupplierProfitReport = cache(async (dateRange?: DateRange): Promise<SupplierProfitReportEntry[]> => {
    const db = await getDb();
    if (!db) return [];

    const suppliers = await getSuppliers({ all: true });
    const supplierProfits: { [key: string]: SupplierProfitReportEntry } = {};

    suppliers.forEach(supplier => {
        supplierProfits[supplier.id] = {
            supplierId: supplier.id,
            supplierName: supplier.name,
            totalTransactions: 0,
            totalVolume: 0,
            totalProfit: 0,
        };
    });

    const interval = dateRange?.from && dateRange.to 
        ? { start: dateRange.from, end: dateRange.to }
        : null;

    const bookingsSnap = await db.collection('bookings').get();
    bookingsSnap.forEach(doc => {
        const booking = doc.data() as BookingEntry;
        const entryDate = parseISO(booking.enteredAt || booking.issueDate);
        if (interval && !isWithinInterval(entryDate, interval)) return;
        
        if (booking.supplierId && supplierProfits[booking.supplierId]) {
            const sale = booking.passengers.reduce((sum, p) => sum + p.salePrice, 0);
            const cost = booking.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);
            supplierProfits[booking.supplierId].totalTransactions += 1;
            supplierProfits[booking.supplierId].totalVolume += cost;
            supplierProfits[booking.supplierId].totalProfit += (sale - cost);
        }
    });

    return Object.values(supplierProfits)
        .filter(s => s.totalTransactions > 0)
        .sort((a, b) => b.totalProfit - a.totalProfit);
});


export interface UserSalesReportEntry {
    userId: string;
    userName: string;
    totalTransactions: number;
    totalSales: number;
    totalProfit: number;
}

export const getUserSalesReport = cache(async (dateRange?: DateRange): Promise<UserSalesReportEntry[]> => {
    const db = await getDb();
    if (!db) return [];

    const users = await getUsers();
    const userSales: { [key: string]: UserSalesReportEntry } = {};

    users.forEach(user => {
        userSales[user.name] = {
            userId: user.uid,
            userName: user.name,
            totalTransactions: 0,
            totalSales: 0,
            totalProfit: 0,
        };
    });
    
    const interval = dateRange?.from && dateRange.to 
        ? { start: dateRange.from, end: dateRange.to }
        : null;

    const collections = ['bookings', 'visaBookings', 'subscriptions'];
    for (const collection of collections) {
        const snapshot = await db.collection(collection).get();
        snapshot.forEach(doc => {
            const entry = doc.data() as any;
            const entryDate = parseISO(entry.enteredAt || entry.issueDate || entry.purchaseDate);
            if (interval && !isWithinInterval(entryDate, interval)) return;

            if (entry.enteredBy && userSales[entry.enteredBy]) {
                const sale = entry.passengers ? entry.passengers.reduce((sum: number, p: any) => sum + p.salePrice, 0) : entry.salePrice || 0;
                const cost = entry.passengers ? entry.passengers.reduce((sum: number, p: any) => sum + p.purchasePrice, 0) : entry.purchasePrice || 0;
                userSales[entry.enteredBy].totalTransactions += 1;
                userSales[entry.enteredBy].totalSales += sale;
                userSales[entry.enteredBy].totalProfit += (sale - cost);
            }
        });
    }

    return Object.values(userSales)
        .filter(u => u.totalTransactions > 0)
        .sort((a,b) => b.totalProfit - a.totalProfit);
});


export interface BoxFlowReportEntry {
    boxId: string;
    boxName: string;
    openingBalance: number;
    totalInflow: number;
    totalOutflow: number;
    closingBalance: number;
}

export const getBoxFlowReport = cache(async (dateRange?: DateRange): Promise<BoxFlowReportEntry[]> => {
    const db = await getDb();
    if (!db) return [];

    const boxes = await getBoxes();
    const boxFlows: { [key: string]: BoxFlowReportEntry } = {};
    
    const interval = dateRange?.from && dateRange.to 
        ? { start: dateRange.from, end: dateRange.to }
        : null;

    boxes.forEach(box => {
        boxFlows[box.id] = {
            boxId: box.id,
            boxName: box.name,
            openingBalance: box.openingBalanceUSD, // Simplified to USD for this report
            totalInflow: 0,
            totalOutflow: 0,
            closingBalance: 0,
        };
    });

    const journalSnapshot = await db.collection('journal-vouchers').get();
    journalSnapshot.forEach(doc => {
        const voucher = doc.data() as JournalVoucher;
        if (voucher.currency !== 'USD') return; // Simplified for now
        const entryDate = parseISO(voucher.date);

        const inRange = interval ? isWithinInterval(entryDate, interval) : true;
        const beforeRange = interval ? entryDate < interval.start : false;
        
        voucher.creditEntries.forEach(entry => { // Credit to a box is inflow
            if (boxFlows[entry.accountId]) {
                if(inRange) boxFlows[entry.accountId].totalInflow += entry.amount;
                else if (beforeRange) boxFlows[entry.accountId].openingBalance += entry.amount;
            }
        });
        voucher.debitEntries.forEach(entry => { // Debit from a box is outflow
            if (boxFlows[entry.accountId]) {
                if(inRange) boxFlows[entry.accountId].totalOutflow += entry.amount;
                else if (beforeRange) boxFlows[entry.accountId].openingBalance -= entry.amount;
            }
        });
    });
    
    Object.values(boxFlows).forEach(box => {
        box.closingBalance = box.openingBalance + box.totalInflow - box.totalOutflow;
    });

    return Object.values(boxFlows).sort((a,b) => b.closingBalance - a.closingBalance);
});


export async function getInvoicesReport(filters: {
  currency: 'USD' | 'IQD' | 'both';
  typeFilter: string[];
  userFilter: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}): Promise<InvoiceReportItem[]> {
    const db = await getDb();
    if (!db) return [];

    // Fetch all relevant collections
    const [bookings, visas, allVouchers] = await Promise.all([
        db.collection('bookings').where('clientId', '==', filters.userFilter).get(),
        db.collection('visaBookings').where('clientId', '==', filters.userFilter).get(),
        db.collection('journal-vouchers').get(), // Fetch all to filter in code
    ]);

    let results: InvoiceReportItem[] = [];

    // Process bookings
    bookings.forEach(doc => {
        const booking = doc.data() as BookingEntry;
        const passengerDetails = (booking.passengers || []).map(p => `${p.name} (تذكرة: ${p.ticketNumber})`).join(', ');
        results.push({
            id: doc.id,
            createDate: booking.enteredAt || booking.issueDate,
            user: booking.enteredBy || 'N/A',
            note: booking.notes || '',
            pnr: booking.pnr,
            date: booking.issueDate,
            credit: 0,
            debit: booking.passengers.reduce((sum, p) => sum + p.salePrice, 0),
            balance: 0, // Will be calculated later
            details: `حجز طيران: ${passengerDetails}`,
            type: "TicketOperation",
        });
    });
    
    // Process visas
    visas.forEach(doc => {
        const visa = doc.data() as VisaBookingEntry;
        const passengerDetails = (visa.passengers || []).map(p => `${p.name} (طلب: ${p.applicationNumber}, نوع: ${p.visaType})`).join(', ');
        results.push({
            id: doc.id,
            createDate: visa.enteredAt || visa.submissionDate,
            user: visa.enteredBy || 'N/A',
            note: visa.notes || '',
            pnr: '',
            date: visa.submissionDate,
            credit: 0,
            debit: visa.passengers.reduce((sum, p) => sum + p.salePrice, 0),
            balance: 0, // Will be calculated later
            details: `طلب فيزا: ${passengerDetails}`,
            type: "Visa",
        });
    });

    // Process all journal vouchers
    allVouchers.forEach(doc => {
        const voucher = doc.data() as JournalVoucher;
        
        const isDebit = voucher.debitEntries.some(e => e.accountId === filters.userFilter);
        const isCredit = voucher.creditEntries.some(e => e.accountId === filters.userFilter);
        
        if (!isDebit && !isCredit) return;

        const debitAmount = isDebit ? voucher.debitEntries.find(e => e.accountId === filters.userFilter)!.amount : 0;
        const creditAmount = isCredit ? voucher.creditEntries.find(e => e.accountId === filters.userFilter)!.amount : 0;
        
        results.push({
            id: doc.id,
            createDate: voucher.createdAt,
            user: voucher.officer,
            note: voucher.notes,
            pnr: '',
            date: voucher.date,
            credit: creditAmount,
            debit: debitAmount,
            balance: 0,
            details: voucher.notes || `حركة من نوع: ${getVoucherTypeLabel(voucher.voucherType)}`,
            type: getVoucherTypeLabel(voucher.voucherType),
        });
    });


    // Filtering logic
    if (filters.typeFilter.length > 0) {
        results = results.filter(item => filters.typeFilter.includes(item.type));
    }
    
    if (filters.dateFrom) {
        results = results.filter(item => parseISO(item.date) >= filters.dateFrom!);
    }
    
    if (filters.dateTo) {
        results = results.filter(item => parseISO(item.date) <= filters.dateTo!);
    }
    
    // Sort and calculate running balance
    results.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    let currentBalance = 0;
    results = results.map(item => {
        currentBalance += (item.debit - item.credit);
        return { ...item, balance: currentBalance };
    });
    
    return results;
}

const initializeNode = (id: string, name: string, code: string, type: AccountType, parentId: string | null): TreeNode => ({
    id, name, code, type, parentId, children: [], debit: 0, credit: 0,
});


export const getChartOfAccounts = cache(async (): Promise<TreeNode[]> => {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    const [clientsSnap, suppliersSnap, boxesSnap, exchangesSnap, vouchersSnap] = await Promise.all([
        db.collection('clients').get(),
        db.collection('suppliers').get(),
        db.collection('boxes').get(),
        db.collection('exchanges').get(),
        db.collection('journal-vouchers').get()
    ]);
    
    const settings = await getSettings();

    const accountsMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    const addNode = (node: TreeNode) => {
        accountsMap.set(node.id, node);
        if (node.parentId === null) {
            rootNodes.push(node);
        } else {
            const parent = accountsMap.get(node.parentId);
            if (parent) {
                parent.children.push(node);
            }
        }
    };
    
    // 1. Add Main Asset/Liability Nodes
    const assets = initializeNode('1', 'الأصول', '1', 'group', null);
    const liabilities = initializeNode('2', 'الالتزامات', '2', 'group', null);
    addNode(assets);
    addNode(liabilities);
    
    // 2. Add sub-groups
    const currentAssets = initializeNode('10', 'الأصول المتداولة', '10', 'group', '1');
    const cashAndBanks = initializeNode('100', 'الصناديق والبنوك', '100', 'group', '10');
    const exchangesGroup = initializeNode('102', 'البورصات', '102', 'group', '10');
    const receivables = initializeNode('101', 'الذمم المدينة (العملاء)', '101', 'group', '10');
    addNode(currentAssets);
    addNode(cashAndBanks);
    addNode(exchangesGroup);
    addNode(receivables);
    
    const currentLiabilities = initializeNode('20', 'الالتزامات المتداولة', '20', 'group', '2');
    const payables = initializeNode('200', 'الذمم الدائنة (الموردين)', '200', 'group', '20');
    addNode(currentLiabilities);
    addNode(payables);
    
    const revenues = initializeNode('4', 'الإيرادات', '4', 'group', null);
    const expenses = initializeNode('5', 'المصروفات', '5', 'group', null);
    addNode(revenues);
    addNode(expenses);
    

    // 3. Populate from collections
    boxesSnap.forEach(doc => {
        const data = doc.data() as Box;
        addNode(initializeNode(doc.id, data.name, `100-${doc.id.slice(0,4)}`, 'box', '100'));
    });
    
     exchangesSnap.forEach(doc => {
        const data = doc.data() as Exchange;
        addNode(initializeNode(doc.id, data.name, `102-${doc.id.slice(0,4)}`, 'exchange', '102'));
    });

    clientsSnap.forEach(doc => {
        const data = doc.data() as Client;
        if(data.relationType === 'client' || data.relationType === 'both') {
            addNode(initializeNode(doc.id, data.name, `101-${doc.id.slice(0,4)}`, 'client', '101'));
        }
    });

    suppliersSnap.forEach(doc => {
        const data = doc.data() as Supplier;
         if(data.relationType === 'supplier' || data.relationType === 'both') {
            addNode(initializeNode(doc.id, data.name, `200-${doc.id.slice(0,4)}`, 'supplier', '200'));
        }
    });

    // 4. Populate from settings (revenue and expense accounts)
    settings.voucherSettings?.expenseAccounts?.forEach((acc, i) => {
        addNode(initializeNode(acc.id, acc.name, `50${i}`, 'expense', '5'));
    });
    // Add revenue accounts if they are defined in settings
    
    
    // 5. Process transactions
    vouchersSnap.forEach(doc => {
        const voucher = doc.data() as JournalVoucher;
        voucher.debitEntries?.forEach(entry => {
            const node = accountsMap.get(entry.accountId);
            if (node) node.debit += entry.amount;
        });
        voucher.creditEntries?.forEach(entry => {
             const node = accountsMap.get(entry.accountId);
            if (node) node.credit += entry.amount;
        });
    });

    return rootNodes;
});
