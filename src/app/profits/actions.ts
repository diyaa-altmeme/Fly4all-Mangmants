
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { BookingEntry, Subscription, VisaBookingEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export type MonthlyProfit = {
  id: string; // Format: "YYYY-MM"
  totalProfit: number;
  breakdown: {
    tickets: number;
    visa: number;
    subscriptions: number;
    groups: number;
  };
  createdAt: string; // ISO string
  fromSystem: boolean;
};

export async function getMonthlyProfits(): Promise<MonthlyProfit[]> {
    const db = await getDb();
    if (!db) return [];
    try {
        const snapshot = await db.collection('monthly_profits').orderBy('id', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyProfit));
    } catch (e) {
        console.error("Error fetching monthly profits:", e);
        return [];
    }
}

function calculatePassengerProfit(passengers: any[]): number {
    if (!passengers || !Array.isArray(passengers)) return 0;
    return passengers.reduce((total, p) => {
        const sale = p.salePrice || 0;
        const purchase = p.purchasePrice || 0;
        return total + (sale - purchase);
    }, 0);
}

export async function calculateAndSaveProfits(monthId: string): Promise<{ success: boolean; data?: MonthlyProfit; error?: string }> {
    const db = await getDb();
    if (!db) {
        return { success: false, error: 'Database not available' };
    }

    try {
        const targetMonth = new Date(monthId);
        const startDate = startOfMonth(targetMonth).toISOString();
        const endDate = endOfMonth(targetMonth).toISOString();

        // Fetch all data in parallel
        const [bookingsSnap, visasSnap, subscriptionsSnap] = await Promise.all([
            db.collection('bookings').where('issueDate', '>=', startDate.split('T')[0]).where('issueDate', '<=', endDate.split('T')[0]).get(),
            db.collection('visaBookings').where('submissionDate', '>=', startDate.split('T')[0]).where('submissionDate', '<=', endDate.split('T')[0]).get(),
            db.collection('subscriptions').where('purchaseDate', '>=', startDate.split('T')[0]).where('purchaseDate', '<=', endDate.split('T')[0]).get(),
        ]);
        
        let ticketsProfit = 0;
        bookingsSnap.forEach(doc => {
            const booking = doc.data() as BookingEntry;
            ticketsProfit += calculatePassengerProfit(booking.passengers);
        });

        let visaProfit = 0;
        visasSnap.forEach(doc => {
            const visaBooking = doc.data() as VisaBookingEntry;
            visaProfit += calculatePassengerProfit(visaBooking.passengers);
        });
        
        let subscriptionsProfit = 0;
        subscriptionsSnap.forEach(doc => {
            const sub = doc.data() as Subscription;
            subscriptionsProfit += sub.profit || 0;
        });

        const breakdown = {
            tickets: ticketsProfit,
            visa: visaProfit,
            subscriptions: subscriptionsProfit,
            groups: 0, // Placeholder for future implementation
        };

        const totalProfit = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

        const dataToSave: Omit<MonthlyProfit, 'id'> = {
            totalProfit,
            breakdown,
            createdAt: new Date().toISOString(),
            fromSystem: true,
        };

        await db.collection('monthly_profits').doc(monthId).set(dataToSave, { merge: true });

        revalidatePath('/profits');
        
        return { success: true, data: { id: monthId, ...dataToSave } };

    } catch (error: any) {
        console.error("Error calculating profits:", error);
        return { success: false, error: error.message };
    }
}
