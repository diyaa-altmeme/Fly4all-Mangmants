

"use server";

import { getDb } from '@/lib/firebase-admin';
import type { FlyChangeEntry, BaggagePurchaseEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';

// Unified type for the table
export type FlyChangeOrBaggage = (FlyChangeEntry | BaggagePurchaseEntry) & { type: 'change' | 'baggage' };

const generateInvoiceNumber = () => {
    return `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Actions for Fly Changes
export async function saveFlyChange(data: Omit<FlyChangeEntry, 'id' | 'invoiceNumber'>): Promise<{ success: boolean; data?: FlyChangeEntry, error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        const docRef = db.collection('fly_changes').doc();
        const finalData: FlyChangeEntry = { 
            ...data, 
            id: docRef.id,
            invoiceNumber: generateInvoiceNumber() 
        };
        await docRef.set(finalData);
        revalidatePath('/bookings/fly-changes');
        return { success: true, data: finalData };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateFlyChange(id: string, data: Partial<FlyChangeEntry>): Promise<{ success: boolean, error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection('fly_changes').doc(id).update(data);
        revalidatePath('/bookings/fly-changes');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteFlyChange(id: string): Promise<{ success: boolean, error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection('fly_changes').doc(id).delete();
        revalidatePath('/bookings/fly-changes');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


// Actions for Baggage Purchase
export async function saveBaggagePurchase(data: Omit<BaggagePurchaseEntry, 'id' | 'invoiceNumber'>): Promise<{ success: boolean; data?: BaggagePurchaseEntry, error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        const docRef = db.collection('baggage_purchases').doc();
        const finalData: BaggagePurchaseEntry = { 
            ...data, 
            id: docRef.id,
            invoiceNumber: generateInvoiceNumber()
        };
        await docRef.set(finalData);
        revalidatePath('/bookings/fly-changes');
        return { success: true, data: finalData };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateBaggagePurchase(id: string, data: Partial<BaggagePurchaseEntry>): Promise<{ success: boolean, error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection('baggage_purchases').doc(id).update(data);
        revalidatePath('/bookings/fly-changes');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteBaggagePurchase(id: string): Promise<{ success: boolean, error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection('baggage_purchases').doc(id).delete();
        revalidatePath('/bookings/fly-changes');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


// Combined fetch action
export const getFlyChangesAndBaggage = cache(async (): Promise<FlyChangeOrBaggage[]> => {
    const db = await getDb();
    if (!db) return [];
    try {
        const changesSnapshot = await db.collection('fly_changes').get();
        const baggageSnapshot = await db.collection('baggage_purchases').get();

        const changes = changesSnapshot.docs.map(doc => ({ ...(doc.data() as FlyChangeEntry), id: doc.id, type: 'change' as const }));
        const baggage = baggageSnapshot.docs.map(doc => ({ ...(doc.data() as BaggagePurchaseEntry), id: doc.id, type: 'baggage' as const }));

        const combinedData = [...changes, ...baggage];
        
        // Sort by issue date, descending
        return combinedData.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    } catch(e: any) {
        console.error("Error fetching fly changes and baggage data:", e.message);
        throw new Error("Failed to fetch data.");
    }
});

// Deprecated
export async function saveFlightReport(report: FlightReport): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        const docRef = db.collection('flight_reports').doc(report.flightInfo.date);
        await docRef.set(report, { merge: true });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
