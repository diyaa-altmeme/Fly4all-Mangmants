
'use server';

import { getDb, getStorageAdmin } from '@/lib/firebase-admin';
import type { ReconciliationFile } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { format } from 'date-fns';

const ARCHIVED_FILES_COLLECTION = 'reconciliation_files';

export async function getArchivedFiles(): Promise<ReconciliationFile[]> {
    const db = await getDb();
    if (!db) return [];
    try {
        const snapshot = await db.collection(ARCHIVED_FILES_COLLECTION).orderBy('uploadedAt', 'desc').limit(100).get();
        if (snapshot.empty) return [];
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ReconciliationFile));
    } catch (error) {
        console.error("Error getting archived files: ", String(error));
        throw new Error("Failed to fetch archived files.");
    }
}


export async function deleteArchivedFile(fileData: ReconciliationFile): Promise<{ success: boolean, error?: string }> {
    const db = await getDb();
    const storage = await getStorageAdmin();
    if (!db || !storage) return { success: false, error: "Database or Storage not available." };

    try {
        // Delete from Storage
        const bucket = storage.bucket();
        await bucket.file(fileData.fullPath).delete();

        // Delete from Firestore
        await db.collection(ARCHIVED_FILES_COLLECTION).doc(fileData.id).delete();
        
        revalidatePath('/reconciliation/files');
        return { success: true };
    } catch(error: any) {
        console.error("Error deleting archived file:", String(error));
        return { success: false, error: "Failed to delete file." };
    }
}
