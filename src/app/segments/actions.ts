
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { SegmentEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { getNextVoucherNumber } from '@/lib/sequences';

const SEGMENTS_COLLECTION = 'segments';

export async function getSegments(): Promise<SegmentEntry[]> {
    try {
        const db = await getDb();
        if (!db) return [];
        const snapshot = await db.collection(SEGMENTS_COLLECTION).orderBy('toDate', 'desc').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SegmentEntry));
    } catch (error) {
        console.error("Error getting segments from Firestore: ", String(error));
        return [];
    }
}

export async function addSegmentEntries(entries: Omit<SegmentEntry, 'id' | 'invoiceNumber'>[]): Promise<{ success: boolean; error?: string, newEntries?: SegmentEntry[] }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    const batch = db.batch();
    const newEntries: SegmentEntry[] = [];
    try {
        const clientSettingsToUpdate: { [clientId: string]: any } = {};

        for (const entryData of entries) {
            const docRef = db.collection(SEGMENTS_COLLECTION).doc();
            const invoiceNumber = await getNextVoucherNumber('SEG');
            
            const dataWithUser: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                invoiceNumber,
                enteredBy: user.name,
                createdAt: new Date().toISOString(),
            };
            batch.set(docRef, dataWithUser);

            newEntries.push({ ...dataWithUser, id: docRef.id });

            clientSettingsToUpdate[entryData.clientId] = {
                ticketProfitPercentage: entryData.ticketProfitPercentage,
                visaProfitPercentage: entryData.visaProfitPercentage,
                hotelProfitPercentage: entryData.hotelProfitPercentage,
                groupProfitPercentage: entryData.groupProfitPercentage,
                alrawdatainSharePercentage: entryData.alrawdatainSharePercentage,
            };
        }

        for (const clientId in clientSettingsToUpdate) {
            const clientRef = db.collection('clients').doc(clientId);
            batch.update(clientRef, { segmentSettings: clientSettingsToUpdate[clientId] });
        }


        await batch.commit();

        revalidatePath('/segments');
        return { success: true, newEntries };
    } catch (error) {
        console.error("Error adding segment entries: ", String(error));
        return { success: false, error: "Failed to add segment entries." };
    }
}


export async function updateSegmentEntry(id: string, data: Partial<Omit<SegmentEntry, 'id'>>) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection(SEGMENTS_COLLECTION).doc(id).update(data);
        revalidatePath('/segments');
        return { success: true };
    } catch (error) {
        console.error("Error updating segment entry: ", String(error));
        return { success: false, error: "Failed to update segment entry." };
    }
}

export async function deleteSegmentEntry(id: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection(SEGMENTS_COLLECTION).doc(id).delete();
        revalidatePath('/segments');
        return { success: true };
    } catch (error) {
        console.error("Error deleting segment entry: ", String(error));
        return { success: false, error: "Failed to delete segment entry." };
    }
}

export async function deleteSegmentPeriod(fromDate: string, toDate: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        const snapshot = await db.collection(SEGMENTS_COLLECTION)
            .where('fromDate', '==', fromDate)
            .where('toDate', '==', toDate)
            .get();
        
        if (snapshot.empty) {
            return { success: true, count: 0 };
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        revalidatePath('/segments');
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error deleting segment period: ", String(error));
        return { success: false, error: "Failed to delete segment period." };
    }
}
