'use server';

import { getDb } from '@/lib/firebase-admin';
import type { MessageTemplate } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const TEMPLATES_COLLECTION = 'message_templates';

export async function getMessageTemplates(): Promise<MessageTemplate[]> {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection(TEMPLATES_COLLECTION).orderBy('name').get();
        if (snapshot.empty) return [];
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as MessageTemplate));

    } catch (error) {
        console.error("Error getting message templates:", String(error));
        return [];
    }
}

export async function addMessageTemplate(templateData: Omit<MessageTemplate, 'id'>): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    try {
        await db.collection(TEMPLATES_COLLECTION).add(templateData);
        revalidatePath('/templates');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateMessageTemplate(id: string, templateData: Partial<MessageTemplate>): Promise<{ success: boolean; error?: string }> {
     const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };
    try {
        await db.collection(TEMPLATES_COLLECTION).doc(id).update(templateData);
        revalidatePath('/templates');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteMessageTemplate(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };
    try {
        await db.collection(TEMPLATES_COLLECTION).doc(id).delete();
        revalidatePath('/templates');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
