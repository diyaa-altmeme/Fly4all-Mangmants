'use server';

import { getDb } from '@/lib/firebase-admin';
import type { JournalVoucher, Client, Supplier, Box, User, AppSettings, BookingEntry, VisaBookingEntry, Subscription, Exchange, TreeNode } from '@/lib/types';
import { normalizeVoucherType } from '@/lib/accounting/voucher-types';
import { parseISO } from 'date-fns';
import { getChartOfAccounts } from '@/app/settings/accounting/chart-of-accounts/actions';

export type Voucher = {
  id: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  currency: string;
  voucherType: string;
  normalizedType: string;
  voucherTypeLabel?: string;
  companyName: string;
  boxName: string;
  officer: string;
  createdAt: string;
  notes: string;
  originalData?: any;
  isDeleted?: boolean; // Added status field
};

export async function getAllVouchers(
    clients: Client[],
    suppliers: Supplier[],
    boxes: Box[],
    users: User[],
    settings: AppSettings,
    exchanges: Exchange[],
    chartOfAccounts: TreeNode[],
): Promise<Voucher[]> {
    const db = await getDb();
    if (!db) return [];

    let query: FirebaseFirestore.Query = db.collection('journal-vouchers');
    
    const snapshot = await query.orderBy('createdAt', 'desc').limit(500).get();
    if (snapshot.empty) return [];
    
    const accountLabelMap = new Map<string, string>();
    clients.forEach(c => accountLabelMap.set(c.id, c.name));
    suppliers.forEach(s => accountLabelMap.set(s.id, s.name));
    boxes.forEach(b => accountLabelMap.set(b.id, b.name));
    users.forEach(u => accountLabelMap.set(u.uid, u.name));
     // Add static/system accounts
    Object.entries(settings.financeAccounts?.revenueMap || {}).forEach(([key, id]) => accountLabelMap.set(id, `إيراد: ${key}`));
    Object.entries(settings.financeAccounts?.expenseMap || {}).forEach(([key, id]) => accountLabelMap.set(id, `مصروف: ${key}`));
    if(settings.financeAccounts?.receivableAccountId) accountLabelMap.set(settings.financeAccounts.receivableAccountId, 'ذمم مدينة');
    if(settings.financeAccounts?.payableAccountId) accountLabelMap.set(settings.financeAccounts.payableAccountId, 'ذمم دائنة');
    if(settings.financeAccounts?.clearingAccountId) accountLabelMap.set(settings.financeAccounts.clearingAccountId, 'حساب تسوية');


    const getAccountName = (id: string) => accountLabelMap.get(id) || id;

    return snapshot.docs.map(doc => {
        const data = doc.data() as JournalVoucher;
        
        const debitAmount = data.debitEntries?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
        const creditAmount = data.creditEntries?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
        const totalAmount = Math.max(debitAmount, creditAmount);
        
        let companyName = "حركات متعددة";
        
        // Find the "other" party in the transaction. If it's a simple transaction, it's the opposite entry.
        if (data.debitEntries?.length === 1 && data.creditEntries?.length === 1) {
            // A simple way to determine the primary "party" is to find the non-box/non-internal account
            const debitIsSystem = ['box', 'revenue', 'expense', 'clearing'].includes(inferAccountCategory(data.debitEntries[0].accountId, settings.financeAccounts));
            const creditIsSystem = ['box', 'revenue', 'expense', 'clearing'].includes(inferAccountCategory(data.creditEntries[0].accountId, settings.financeAccounts));
            
            if (!creditIsSystem) companyName = getAccountName(data.creditEntries[0].accountId);
            else if (!debitIsSystem) companyName = getAccountName(data.debitEntries[0].accountId);
            else companyName = getAccountName(data.creditEntries[0].accountId); // fallback

        } else if (data.creditEntries?.length > 0) {
            companyName = getAccountName(data.creditEntries[0].accountId);
        } else if (data.debitEntries?.length > 0) {
             companyName = getAccountName(data.debitEntries[0].accountId);
        }
        

        // Overrides for specific types for better context
        if (data.originalData?.clientId) {
            companyName = getAccountName(data.originalData.clientId);
        } else if (data.originalData?.supplierId) {
            companyName = getAccountName(data.originalData.supplierId);
        } else if (data.originalData?.from) { // For standard receipts
             companyName = getAccountName(data.originalData.from);
        } else if (data.originalData?.payeeId) { // For payment vouchers
             companyName = getAccountName(data.originalData.payeeId);
        } else if (data.sourceType === 'segment_payout') {
            companyName = getAccountName(data.meta?.partnerId);
        } else if (data.sourceType === 'segment_revenue') {
             companyName = "إيرادات الروضتين";
        }
        


        const boxId = data.originalData?.boxId || data.debitEntries?.find(e => boxes.some(b => b.id === e.accountId))?.accountId || data.creditEntries?.find(e => boxes.some(b => b.id === e.accountId))?.accountId;
        const boxName = boxId ? getAccountName(boxId) : 'N/A';
        const officer = data.officer || getAccountName(data.createdBy || '') || 'غير معروف';
        const normalizedType = normalizeVoucherType(data.voucherType);

        return {
            id: doc.id,
            invoiceNumber: data.invoiceNumber,
            date: data.date,
            totalAmount: totalAmount,
            currency: data.currency,
            voucherType: data.voucherType,
            normalizedType: normalizedType,
            voucherTypeLabel: getVoucherTypeLabel(normalizedType),
            companyName: companyName,
            boxName: boxName,
            officer: officer,
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : (data.createdAt as any)?.toDate?.().toISOString() || new Date().toISOString(),
            notes: data.notes || data.originalData?.details || '',
            originalData: data.originalData,
            isDeleted: !!data.isDeleted,
        };
    });
}


const inferAccountCategory = (accountId: string, financeAccounts: any) => {
    if (!accountId || !financeAccounts) return 'other';
    if (accountId === financeAccounts.receivableAccountId) return 'client';
    if (accountId === financeAccounts.payableAccountId) return 'supplier';
    if (accountId === financeAccounts.defaultCashId) return 'box';
    if (Object.values(financeAccounts.revenueMap || {}).includes(accountId)) return 'revenue';
    if (Object.values(financeAccounts.expenseMap || {}).includes(accountId)) return 'expense';
    if (accountId === financeAccounts.clearingAccountId) return 'clearing';
    return 'other';
};


const getVoucherTypeLabel = (type?: string): string => {
  const normalized = normalizeVoucherType(type);
  const labels: Record<NormalizedVoucherType, string> = {
    standard_receipt: 'سند قبض',
    distributed_receipt: 'سند قبض موزع',
    payment: 'سند دفع',
    manualExpense: 'سند مصاريف',
    journal_voucher: 'قيد محاسبي',
    remittance: 'حوالة',
    transfer: 'تحويل داخلي',
    booking: 'حجز طيران',
    visa: 'طلب فيزا',
    subscription: 'اشتراك',
    segment: 'سكمنت',
    'profit-sharing': 'توزيع أرباح',
    refund: 'استرجاع',
    exchange: 'تغيير',
    void: 'إلغاء',
    exchange_transaction: 'معاملة بورصة',
    exchange_payment: 'تسديد بورصة',
    exchange_adjustment: 'تسوية بورصة',
    exchange_revenue: 'إيراد بورصة',
    exchange_expense: 'مصروف بورصة',
    other: 'عملية أخرى'
  };
  return labels[normalized] || 'غير معروف';
};

