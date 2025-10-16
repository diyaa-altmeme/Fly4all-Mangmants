
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
    // Check if it's a manual profit ID
    const manualDoc = await db.collection('manual_monthly_profits').doc(monthId).get();
    if (manualDoc.exists) {
        const data = manualDoc.data();
        return (data?.partners || []).map((p: any, index: number) => ({
            ...p,
            id: p.id || `${monthId}-${index}`, // Ensure a unique ID
            profitMonthId: monthId,
            notes: 'حصة من توزيع يدوي',
        }));
    }

    // Otherwise, fetch from profit_shares
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
    if (!user) return { success: false, error: "User not authenticated." };

    const writeBatch = db.batch();
    const manualProfitRef = db.collection('manual_monthly_profits').doc();
    const journalVoucherRef = db.collection('journal-vouchers').doc();

    try {
        const invoiceNumber = await getNextVoucherNumber('PR');
        
        writeBatch.set(manualProfitRef, {
            ...data,
            invoiceNumber,
            createdBy: user.uid,
            userName: user.name,
            createdAt: new Date().toISOString(),
        });
        
        const alrawdatainShare = data.partners.find(p => p.partnerId === 'alrawdatain_share');
        
        const creditEntries: JournalEntry[] = data.partners
            .filter(p => p.partnerId !== 'alrawdatain_share') // Exclude company share from partner liabilities
            .map(p => ({
                accountId: p.partnerId,
                amount: p.amount,
                description: `حصة من أرباح الفترة ${data.fromDate} إلى ${data.toDate}`,
            }));
            
        // Add company's share to revenue
        if (alrawdatainShare && alrawdatainShare.amount > 0) {
             creditEntries.push({
                accountId: 'revenue_profit_distribution', // Dedicated revenue account
                amount: alrawdatainShare.amount,
                description: `حصة الشركة من أرباح الفترة ${data.fromDate} إلى ${data.toDate}`,
             });
        }
        
        const debitEntries: JournalEntry[] = [{
            accountId: data.sourceAccountId,
            amount: data.profit,
            description: `توزيع أرباح الفترة ${data.fromDate} إلى ${data.toDate}`,
        }];
        
        writeBatch.set(journalVoucherRef, {
            invoiceNumber,
            date: new Date().toISOString(),
            currency: data.currency,
            notes: `توزيع أرباح يدوية من ${data.sourceAccountId} للفترة ${data.fromDate} - ${data.toDate}`,
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "journal_from_profit_distribution",
            debitEntries,
            creditEntries,
            isAudited: true,
            isConfirmed: true,
            originalData: { ...data, manualProfitId: manualProfitRef.id },
        });

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
