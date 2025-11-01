"use server";

import { getFinanceMap, postJournalEntries } from '@/lib/finance/posting';

export async function recordProfitShare(payoutId: string, partnerAccountId: string, amount: number) {
  if (amount <= 0) return;
  const fm = await getFinanceMap();
  const retainedEarnings = fm.defaultBankId || fm.defaultCashId || null; // fallback
  if (!retainedEarnings) throw new Error('No retained earnings (or cash/bank) account configured');

  const entries = [
    { accountId: retainedEarnings, debit: amount, credit: 0, description: 'تسوية ربح/أرباح مرحلة' },
    { accountId: partnerAccountId, debit: 0, credit: amount, description: 'ذمم دائنة - حصة شريك' },
  ];

  await postJournalEntries({ sourceType: 'profit_sharing', sourceId: payoutId, entries });
}

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Client, Supplier, Currency, MonthlyProfit, ProfitShare, JournalEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { format, parseISO } from 'date-fns';
import { getNextVoucherNumber } from '@/lib/sequences';
import { getCurrentUserFromSession } from '@/lib/auth/actions';

export async function getMonthlyProfits(): Promise<MonthlyProfit[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const [systemSnapshot, manualSnapshot] = await Promise.all([
        db.collection('monthly_profits').orderBy('id', 'desc').get(),
        db.collection('manual_monthly_profits').orderBy('toDate', 'desc').get()
    ]);
    
    const systemProfits = systemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), fromSystem: true } as MonthlyProfit));
    
    const manualProfits = manualSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        invoiceNumber: data.invoiceNumber,
        totalProfit: data.profit,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        userName: data.userName,
        fromSystem: false,
        notes: `أرباح يدوية للفترة من ${data.fromDate} إلى ${data.toDate}`,
        currency: data.currency,
        partners: data.partners,
        fromDate: data.fromDate,
        toDate: data.toDate,
        sourceAccountId: data.sourceAccountId,
      } as MonthlyProfit;
    });

    const allProfits = [...systemProfits, ...manualProfits];
    allProfits.sort((a,b) => {
        const dateA = a.id.length === 7 ? parseISO(`${a.id}-01`) : parseISO(a.createdAt);
        const dateB = b.id.length === 7 ? parseISO(`${b.id}-01`) : parseISO(b.createdAt);
        return dateB.getTime() - dateA.getTime();
    });

    return allProfits;
  } catch (e) {
    console.error("Error fetching monthly profits:", e);
    return [];
  }
}

export async function getProfitSharesForMonth(monthId: string): Promise<ProfitShare[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const manualDoc = await db.collection('manual_monthly_profits').doc(monthId).get();
    if (manualDoc.exists) {
        const data = manualDoc.data();
        const partnersData = data?.partners || [];
        
        const journalVouchersSnap = await db.collection('journal-vouchers')
            .where('originalData.manualProfitId', '==', monthId)
            .get();
        
        const invoiceNumbersByPartnerId: Record<string, string> = {};
        journalVouchersSnap.forEach(doc => {
            const voucher = doc.data();
            const partnerId = voucher.originalData?.partnerId;
            if (partnerId) {
                invoiceNumbersByPartnerId[partnerId] = voucher.invoiceNumber;
            }
            // For alrawdatain share
            if(voucher.creditEntries?.some((e: any) => e.accountId === 'revenue_profit_distribution')) {
                invoiceNumbersByPartnerId['alrawdatain_share'] = voucher.invoiceNumber;
            }
        });

        return partnersData.map((p: any, index: number) => ({
            ...p,
            id: p.id || `${monthId}-${index}`, 
            profitMonthId: monthId,
            invoiceNumber: invoiceNumbersByPartnerId[p.partnerId] || null,
            notes: 'حصة من توزيع يدوي',
        }));
    }

    const snapshot = await db.collection('profit_shares').where('profitMonthId', '==', monthId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProfitShare));
  } catch (e) {
    console.error("Error fetching profit shares for month:", e);
    return [];
  }
}

export async function saveProfitShare(data: Omit<ProfitShare, 'id'>): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };
  try {
    await db.collection('profit_shares').add(data);
    revalidatePath('/profit-sharing');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function saveManualProfitDistribution(data: {
    fromDate: string;
    toDate: string;
    sourceAccountId: string;
    profit: number;
    currency: Currency;
    partners: Omit<ProfitShare, 'id' | 'profitMonthId'>[];
}): Promise<{ success: boolean; error?: string; }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    const user = await getCurrentUserFromSession();
    if (!user || !('role' in user) || !user.boxId) return { success: false, error: "User not authenticated or box not assigned." };

    const writeBatch = db.batch();
    const manualProfitRef = db.collection('manual_monthly_profits').doc();

    try {
        const receiptInvoice = await getNextVoucherNumber('RC');
        const periodText = `للفترة من ${data.fromDate} إلى ${data.toDate}`;
        
        writeBatch.set(manualProfitRef, {
            ...data,
            invoiceNumber: receiptInvoice, // Main invoice number for the period
            createdBy: user.uid,
            userName: user.name,
            createdAt: new Date().toISOString(),
        });
        
        const receiptVoucherRef = db.collection('journal-vouchers').doc();
        writeBatch.set(receiptVoucherRef, {
            invoiceNumber: receiptInvoice,
            date: new Date().toISOString(),
            currency: data.currency,
            notes: `استلام أرباح السكمنت ${periodText} من المصدر`,
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "journal_from_standard_receipt",
            debitEntries: [{ accountId: user.boxId, amount: data.profit, description: `إيداع أرباح ${periodText}` }],
            creditEntries: [{ accountId: data.sourceAccountId, amount: data.profit, description: `سحب أرباح ${periodText}` }],
            isAudited: true, isConfirmed: true, originalData: { ...data, manualProfitId: manualProfitRef.id }
        });

        // Pay out partner shares
        for (const p of data.partners.filter(p => p.partnerId !== 'alrawdatain_share')) {
            const partnerPaymentInvoice = await getNextVoucherNumber('PV');
            const partnerPaymentRef = db.collection('journal-vouchers').doc();
            writeBatch.set(partnerPaymentRef, {
                invoiceNumber: partnerPaymentInvoice,
                date: new Date().toISOString(),
                currency: data.currency,
                notes: `دفع حصة الشريك ${p.partnerName} عن أرباح ${periodText}`,
                createdBy: user.uid,
                officer: user.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                voucherType: "journal_from_payment",
                debitEntries: [{ accountId: p.partnerId, amount: p.amount, description: `إيداع حصة أرباح ${periodText}` }],
                creditEntries: [{ accountId: user.boxId, amount: p.amount, description: `دفع حصة أرباح للشريك ${p.partnerName}` }],
                isAudited: true, isConfirmed: true, originalData: { ...data, manualProfitId: manualProfitRef.id, partnerId: p.partnerId }
            });
        }
        
        const alrawdatainShare = data.partners.find(p => p.partnerId === 'alrawdatain_share');
        if (alrawdatainShare && alrawdatainShare.amount > 0) {
            const companyProfitInvoice = await getNextVoucherNumber('JE');
            const companyProfitRef = db.collection('journal-vouchers').doc();
            writeBatch.set(companyProfitRef, {
                invoiceNumber: companyProfitInvoice,
                date: new Date().toISOString(),
                currency: data.currency,
                notes: `إثبات حصة الشركة من أرباح السكمنت ${periodText}`,
                createdBy: user.uid,
                officer: user.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                voucherType: "journal_voucher",
                debitEntries: [{ accountId: user.boxId, amount: alrawdatainShare.amount, description: `سحب حصة الشركة من الصندوق` }],
                creditEntries: [{ accountId: 'revenue_profit_distribution', amount: alrawdatainShare.amount, description: `تسجيل إيراد حصة الشركة ${periodText}` }],
                isAudited: true, isConfirmed: true, originalData: { ...data, manualProfitId: manualProfitRef.id, partnerId: 'alrawdatain_share' }
            });
        }
        
        await writeBatch.commit();
        
        revalidatePath('/profit-sharing');
        revalidatePath('/reports/account-statement');
        return { success: true };
    } catch (e: any) {
        console.error("Error saving manual profit distribution:", e);
        return { success: false, error: e.message };
    }
}

export async function updateManualProfitDistribution(id: string, data: {
    fromDate: string;
    toDate: string;
    profit: number;
    currency: Currency;
    partners: Omit<ProfitShare, 'id' | 'profitMonthId'>[];
}): Promise<{ success: boolean; error?: string; }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    try {
        await db.collection('manual_monthly_profits').doc(id).update({
            ...data,
            updatedAt: new Date().toISOString(),
        });
        revalidatePath('/profit-sharing');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function updateProfitShare(id: string, data: Partial<ProfitShare>): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };
  try {
    await db.collection('profit_shares').doc(id).update(data);
    revalidatePath('/profit-sharing');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteProfitShare(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    try {
        await db.collection('profit_shares').doc(id).delete();
        revalidatePath('/profit-sharing');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function deleteManualProfitPeriod(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    try {
        await db.collection('manual_monthly_profits').doc(id).delete();
        revalidatePath('/profit-sharing');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// In a real scenario, this would calculate from bookings
export async function seedMonthlyProfit(monthId: string, profit: number) {
    const db = await getDb();
    if (!db) return;
    const docRef = db.collection('monthly_profits').doc(monthId);
    await docRef.set({
        id: monthId,
        totalProfit: profit,
        createdAt: new Date().toISOString(),
        fromSystem: true,
        notes: `أرباح شهر ${monthId}`
    }, { merge: true });
    revalidatePath('/profit-sharing');
}
