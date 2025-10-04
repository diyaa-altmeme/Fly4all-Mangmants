

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Notification } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '../auth/actions';

const NOTIFICATIONS_COLLECTION = 'notifications';

export async function getNotificationsForUser(userId: string, options: { limit?: number; unreadOnly?: boolean } = {}): Promise<Notification[]> {
    const db = await getDb();
    if (!db) return [];

    try {
        let query: FirebaseFirestore.Query = db.collection(NOTIFICATIONS_COLLECTION).where('userId', '==', userId);

        if (options.unreadOnly) {
            query = query.where('isRead', '==', false);
        }
        
        // Removed orderBy to avoid composite index requirement.
        // query = query.orderBy('createdAt', 'desc');

        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        const snapshot = await query.get();

        if (snapshot.empty) return [];
        
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));

        // Sort in code
        notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        return notifications;

    } catch (error) {
        console.error("Error getting notifications:", String(error));
        return [];
    }
}

export async function createNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        await db.collection(NOTIFICATIONS_COLLECTION).add({
            ...notificationData,
            createdAt: new Date().toISOString(),
            isRead: false,
        });
        // We don't need to revalidate paths for notifications as they are fetched client-side.
        return { success: true };
    } catch (error) {
        console.error("Error creating notification:", String(error));
        return { success: false, error: "Failed to create notification." };
    }
}


export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        await db.collection(NOTIFICATIONS_COLLECTION).doc(notificationId).update({ isRead: true });
        revalidatePath('/notifications'); // Revalidate if there's a full notifications page
        return { success: true };
    } catch (error) {
        console.error("Error marking notification as read:", String(error));
        return { success: false, error: "Failed to update notification." };
    }
}


export async function markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const snapshot = await db.collection(NOTIFICATIONS_COLLECTION).where('userId', '==', userId).where('isRead', '==', false).get();
        if (snapshot.empty) {
            return { success: true }; // Nothing to mark
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();

        revalidatePath('/notifications');
        return { success: true };

    } catch (error) {
        console.error("Error marking all as read:", String(error));
        return { success: false, error: "Failed to update notifications." };
    }
}
