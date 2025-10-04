

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Client, Supplier, Currency } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';

export interface MonthlyProfit {
  id: string; // Format: "YYYY-MM"
  totalProfit: number;
  createdAt: string; // ISO string
  fromSystem: boolean;
  notes?: string;
  currency?: Currency;
  partners?: ProfitShare[]; // For manual entries
}

export interface ProfitShare {
  id: string;
  profitMonthId: string;
  partnerId: string;
  partnerName: string;
  percentage: number;
  amount: number;
  notes?: string;
}

export async function getMonthlyProfits(): Promise<MonthlyProfit[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const [systemSnapshot, manualSnapshot] = await Promise.all([
        db.collection('monthly_profits').orderBy('id', 'desc').get(),
        db.collection('manual_monthly_profits').get()
    ]);
    
    const systemProfits = systemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyProfit));
    
    const manualProfits = manualSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        totalProfit: data.profit,
        createdAt: data.createdAt,
        fromSystem: false,
        notes: `أرباح يدوية للفترة من ${data.fromDate} إلى ${data.toDate}`,
        currency: data.currency,
        partners: data.partners,
      } as MonthlyProfit;
    });

    const allProfits = [...systemProfits, ...manualProfits];
    allProfits.sort((a,b) => b.id.localeCompare(a.id));

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
        return (data?.partners || []).map((p: any) => ({
            ...p,
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
