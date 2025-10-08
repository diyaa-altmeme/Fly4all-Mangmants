

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { AuditLog } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { parseISO } from 'date-fns';

const AUDIT_LOGS_COLLECTION = 'audit_logs';

const processDoc = (doc: FirebaseFirestore.DocumentSnapshot): AuditLog => {
    const data = doc.data() as any;
    // Ensure all potential date fields are consistently strings
    return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    } as AuditLog;
};

export async function createAuditLog(logData: Partial<Omit<AuditLog, 'id' | 'createdAt'>>) {
    const db = await getDb();
    if (!db) {
        console.error("Audit Log failed: Database not available.");
        return;
    }

    try {
        await db.collection(AUDIT_LOGS_COLLECTION).add({
            ...logData,
            level: logData.level || 'info',
            createdAt: new Date().toISOString(),
        });
        revalidatePath('/system/activity-log');
        revalidatePath('/system/error-log');
    } catch (error) {
        console.error("Error creating audit log: ", String(error));
    }
}


export const getAuditLogs = async (): Promise<AuditLog[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection(AUDIT_LOGS_COLLECTION)
            .orderBy('createdAt', 'desc')
            .limit(200)
            .get();
        if (snapshot.empty) return [];
        
        const logs = snapshot.docs
            .map(processDoc)
            .filter(log => log.level !== 'error'); // Filter for non-errors in code

        return logs;

    } catch (error) {
        console.error("Error getting audit logs: ", String(error));
        throw new Error("Failed to fetch audit logs.");
    }
};

export const getErrorLogs = async (): Promise<AuditLog[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection(AUDIT_LOGS_COLLECTION)
            .orderBy('createdAt', 'desc')
            .limit(200)
            .get();
        if (snapshot.empty) return [];
        
        const logs = snapshot.docs
            .map(processDoc)
            .filter(log => log.level === 'error'); // Filter for errors in code
        
        return logs;

    } catch (error) {
        console.error("Error getting error logs: ", String(error));
        throw new Error("Failed to fetch error logs.");
    }
};
