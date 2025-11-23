
import { getDb } from "@/lib/firebase/firebase-admin-sdk";
import { getSettings } from "@/app/settings/actions";
import { NextResponse } from 'next/server';
import { normalizeFinanceAccounts } from '@/lib/finance/finance-accounts';
import { enrichVoucherEntries, isExpenseAccount, isRevenueAccount } from '@/lib/finance/account-categories';

const resolveDate = (value: any): string => {
    if (!value) return new Date().toISOString();
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }
    if (value instanceof Date) return value.toISOString();
    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return date instanceof Date ? date.toISOString() : new Date().toISOString();
    }
    if (typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000).toISOString();
    }
    return new Date().toISOString();
};

export async function GET() {
  try {
    const db = await getDb();
    if (!db) {
        return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }
    const settings = await getSettings();
    const finance = normalizeFinanceAccounts(settings.financeAccounts);
    if (!finance.generalRevenueId || !finance.generalExpenseId || !finance.receivableAccountId) {
         return NextResponse.json({ error: "Finance settings not configured" }, { status: 500 });
    }

    const vouchersSnap = await db.collection('journal-vouchers').get();

    const entries: any[] = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    vouchersSnap.forEach(doc => {
        const voucher = doc.data();
        if (voucher.isDeleted) return;

        const normalizedEntries = enrichVoucherEntries(voucher, finance);
        const voucherDate = resolveDate(voucher.date);
        const description = voucher.notes || voucher.description || '';

        normalizedEntries.forEach(entry => {
            if (entry.credit > 0 && isRevenueAccount(entry.accountId, finance)) {
                totalRevenue += entry.credit;
                entries.push({
                    voucherId: doc.id,
                    accountId: entry.accountId,
                    amount: entry.credit,
                    currency: entry.currency || voucher.currency || 'USD',
                    type: 'revenue',
                    date: voucherDate,
                    description: entry.description || description,
                    sourceType: voucher.sourceType || voucher.voucherType,
                    sourceId: voucher.sourceId || voucher.originalData?.sourceId,
                });
            } else if (entry.debit > 0 && isExpenseAccount(entry.accountId, finance)) {
                totalExpense += entry.debit;
                entries.push({
                    voucherId: doc.id,
                    accountId: entry.accountId,
                    amount: entry.debit,
                    currency: entry.currency || voucher.currency || 'USD',
                    type: 'expense',
                    date: voucherDate,
                    description: entry.description || description,
                    sourceType: voucher.sourceType || voucher.voucherType,
                    sourceId: voucher.sourceId || voucher.originalData?.sourceId,
                });
            }
        });
    });

    // Include legacy journals collection for backward compatibility
    try {
        const journalsSnap = await db.collection('journals').get();
        journalsSnap.forEach(doc => {
            const journal = doc.data();
            const journalDate = resolveDate(journal.date);
            const journalDesc = journal.description || '';
            (journal.entries || []).forEach((entry: any) => {
                if (entry.type === 'credit' && isRevenueAccount(entry.accountId, finance)) {
                    const amount = Number(entry.amount) || 0;
                    totalRevenue += amount;
                    entries.push({
                        voucherId: doc.id,
                        accountId: entry.accountId,
                        amount,
                        currency: entry.currency || journal.currency || 'USD',
                        type: 'revenue',
                        date: journalDate,
                        description: entry.description || journalDesc,
                        sourceType: journal.sourceType || 'legacy_journal',
                        sourceId: journal.sourceId,
                    });
                } else if (entry.type === 'debit' && isExpenseAccount(entry.accountId, finance)) {
                    const amount = Number(entry.amount) || 0;
                    totalExpense += amount;
                    entries.push({
                        voucherId: doc.id,
                        accountId: entry.accountId,
                        amount,
                        currency: entry.currency || journal.currency || 'USD',
                        type: 'expense',
                        date: journalDate,
                        description: entry.description || journalDesc,
                        sourceType: journal.sourceType || 'legacy_journal',
                        sourceId: journal.sourceId,
                    });
                }
            });
        });
    } catch (legacyError) {
        console.warn('Failed to load legacy journals for profit/loss:', legacyError);
    }

    const profit = totalRevenue - totalExpense;

    return NextResponse.json({
      entries,
      totals: { revenue: totalRevenue, expense: totalExpense, profit },
    });
  } catch (error: any) {
     return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
