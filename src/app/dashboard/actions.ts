

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { BookingEntry, Subscription, SubscriptionInstallment, JournalVoucher } from '@/lib/types';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, startOfDay, endOfDay, addDays, isWithinInterval } from 'date-fns';
import { getSettings } from '@/app/settings/actions';

const processDoc = (doc: FirebaseFirestore.DocumentSnapshot): any => {
    const data = doc.data() as any;
    if (!data) return null;

    // Create a deep copy to avoid mutating the original data by serializing and deserializing
    const safeData = JSON.parse(JSON.stringify({ ...data, id: doc.id }));

    // Recursively find and convert date-like objects
    const convertDates = (obj: any) => {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                if (obj[key].hasOwnProperty('_seconds') && obj[key].hasOwnProperty('nanoseconds')) {
                    obj[key] = new Date(obj[key]._seconds * 1000).toISOString();
                } else if (obj[key] instanceof Date) {
                    obj[key] = obj[key].toISOString();
                } else {
                    convertDates(obj[key]);
                }
            }
        }
    };

    convertDates(safeData);
    return safeData;
};


export interface DashboardStats {
    revenue: number;
    profit: number;
    bookingsCount: number;
    activeSubscriptions: number;
    currency: string;
}

function monthIdFromDate(d: Date) {
  return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const db = await getDb();
    if (!db) return { revenue: 0, profit: 0, bookingsCount: 0, activeSubscriptions: 0, currency: 'USD' };

    try {
        const monthId = monthIdFromDate(new Date());
        // This assumes a single company for now. In a multi-tenant app, you'd get the companyId from the user session.
        const companyId = "default";
        const docId = `${companyId}_revenue_${monthId}`;
        
        const aggregatesSnap = await db.collection('aggregates').doc(docId).get();
        const monthData = aggregatesSnap.data() || {};
        
        const activeSubscriptionsSnap = await db.collection('subscriptions').where('status', '==', 'Active').count().get();

        const result = {
            revenue: monthData.totalRevenue || 0,
            profit: monthData.totalProfit || 0,
            bookingsCount: monthData.bookingsCount || 0,
            activeSubscriptions: activeSubscriptionsSnap.data().count,
            currency: 'USD',
        };
        
        return JSON.parse(JSON.stringify(result));

    } catch (error) {
        console.error("Error getting dashboard stats:", String(error));
        return { revenue: 0, profit: 0, bookingsCount: 0, activeSubscriptions: 0, currency: 'USD' };
    }
}

export async function getRecentBookings(): Promise<BookingEntry[]> {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection('journal-vouchers')
            .where('voucherType', '==', 'booking')
            .orderBy('createdAt', 'desc')
            .limit(7)
            .get();

        if (snapshot.empty) return [];
        const bookings = snapshot.docs.map(doc => {
            const processedData = processDoc(doc);
            return processedData.originalData as BookingEntry;
        });

        return JSON.parse(JSON.stringify(bookings));

    } catch (error) {
        console.error("Error getting recent bookings:", String(error));
        return [];
    }
}

export async function getUpcomingInstallments(): Promise<SubscriptionInstallment[]> {
    const db = await getDb();
    if (!db) return [];

    try {
        const today = startOfDay(new Date());
        const nextWeek = endOfDay(addDays(today, 7));

        const snapshot = await db.collection('subscription_installments')
            .where('status', '==', 'Unpaid')
            .where('dueDate', '>=', today.toISOString().split('T')[0])
            .orderBy('dueDate', 'asc')
            .limit(100) // Limit to avoid large reads, filter in code
            .get();
        
        if (snapshot.empty) return [];
        
        const allUnpaid = snapshot.docs.map(doc => processDoc(doc) as SubscriptionInstallment);
        
        const upcoming = allUnpaid
            .filter(inst => isWithinInterval(parseISO(inst.dueDate), { start: today, end: nextWeek }))
            .slice(0, 7); // Limit to 7 after filtering

        return JSON.parse(JSON.stringify(upcoming));

    } catch (error) {
        console.error("Error getting upcoming installments:", String(error));
        return [];
    }
}


export async function getRevenueChartData(): Promise<{ name: string; revenue: number; profit: number }[]> {
    const db = await getDb();
    if (!db) return [];
    
    const today = new Date();
    const chartData: { [key: string]: { revenue: number; profit: number } } = {};
    const promises: Promise<any>[] = [];

    const companyId = "default"; // Assuming single company

    for (let i = 5; i >= 0; i--) {
        const targetDate = subMonths(today, i);
        const monthKey = format(targetDate, 'MMM');
        chartData[monthKey] = { revenue: 0, profit: 0 };
        
        const monthId = monthIdFromDate(targetDate);
        const docId = `${companyId}_revenue_${monthId}`;
        
        promises.push(db.collection('aggregates').doc(docId).get());
    }
    
    try {
        const snapshots = await Promise.all(promises);
        snapshots.forEach((docSnap, index) => {
            const monthKey = Object.keys(chartData)[index];
            if (docSnap.exists) {
                const data = docSnap.data();
                chartData[monthKey].revenue = data?.totalRevenue || 0;
                chartData[monthKey].profit = data?.totalProfit || 0;
            }
        });
        
        const result = Object.entries(chartData).map(([name, values]) => ({ name, ...values }));
        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error getting revenue chart data:", String(error));
        const fallbackResult = Object.keys(chartData).map(name => ({ name, revenue: 0, profit: 0 }));
        return JSON.parse(JSON.stringify(fallbackResult));
    }
}
