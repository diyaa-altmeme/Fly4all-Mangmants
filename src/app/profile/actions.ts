

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { BookingEntry, VisaBookingEntry, JournalVoucher, Subscription } from '@/lib/types';

export interface UserProfileStats {
    vouchersCount: number;
    bookingsCount: number;
    visasCount: number;
    totalProfit: number;
}

export async function getUserProfileStats(userName: string): Promise<UserProfileStats> {
    const db = await getDb();
    if (!db) {
        return { vouchersCount: 0, bookingsCount: 0, visasCount: 0, totalProfit: 0 };
    }
    
    try {
        // Fetch all data in parallel
        const [vouchersSnap, bookingsSnap, visasSnap] = await Promise.all([
            db.collection('journal-vouchers').where('officer', '==', userName).get(),
            db.collection('bookings').where('enteredBy', '==', userName).get(),
            db.collection('visaBookings').where('enteredBy', '==', userName).get(),
        ]);
        
        let totalProfit = 0;
        
        bookingsSnap.forEach(doc => {
            const booking = doc.data();
            const profit = (booking.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice - p.purchasePrice), 0);
            totalProfit += profit;
        });

        visasSnap.forEach(doc => {
            const visa = doc.data();
            const profit = (visa.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice - p.purchasePrice), 0);
            totalProfit += profit;
        });

        return {
            vouchersCount: vouchersSnap.size,
            bookingsCount: bookingsSnap.size,
            visasCount: visasSnap.size,
            totalProfit: totalProfit
        };

    } catch (error) {
        console.error(`Error fetching stats for user ${userName}:`, error);
        return { vouchersCount: 0, bookingsCount: 0, visasCount: 0, totalProfit: 0 };
    }
}

    
