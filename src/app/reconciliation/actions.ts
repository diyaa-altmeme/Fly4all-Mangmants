

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { ReconciliationLog } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const RECONCILIATION_LOGS_COLLECTION = 'reconciliation_logs';

export async function addReconciliationLog(logData: Omit<ReconciliationLog, 'id'>) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        await db.collection(RECONCILIATION_LOGS_COLLECTION).add(logData);
        revalidatePath('/reconciliation/history');
        return { success: true };
    } catch (error) {
        console.error("Error adding reconciliation log: ", String(error));
        return { success: false, error: "Failed to save reconciliation log." };
    }
}

export async function getReconciliationLogs(): Promise<ReconciliationLog[]> {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection(RECONCILIATION_LOGS_COLLECTION).orderBy('runAt', 'desc').limit(50).get();
        if (snapshot.empty) return [];
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ReconciliationLog));
    } catch (error) {
        console.error("Error getting reconciliation logs: ", String(error));
        throw new Error("Failed to fetch reconciliation logs.");
    }
}


export async function getReconciliationLogById(id: string): Promise<ReconciliationLog | null> {
    const db = await getDb();
    if (!db) return null;

    try {
        const doc = await db.collection(RECONCILIATION_LOGS_COLLECTION).doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return { id: doc.id, ...doc.data() } as ReconciliationLog;
    } catch (error) {
        console.error("Error getting reconciliation log by id: ", String(error));
        throw new Error("Failed to fetch reconciliation log.");
    }
}
