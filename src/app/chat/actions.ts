
'use server';

import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import { FieldValue } from 'firebase-admin/firestore';

export async function createOrGetDirectChat(userId1: string, userId2: string): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    // Create a consistent ID for the direct chat
    const chatId = [userId1, userId2].sort().join('_');
    const chatRef = db.collection('chats').doc(chatId);
    
    const chatDoc = await chatRef.get();

    if (chatDoc.exists) {
        // Chat already exists, return its ID
        return chatId;
    } else {
        // Chat doesn't exist, create it
        
        // Fetch user data to enrich chat summaries
        const [user1Doc, user2Doc] = await Promise.all([
            db.collection('users').doc(userId1).get(),
            db.collection('users').doc(userId2).get(),
        ]);

        if (!user1Doc.exists || !user2Doc.exists) {
            throw new Error("One or both users not found.");
        }

        const user1Data = user1Doc.data();
        const user2Data = user2Doc.data();
        
        const membersMap = { [userId1]: true, [userId2]: true };
        const now = FieldValue.serverTimestamp();

        const batch = db.batch();

        // 1. Create the main chat document
        batch.set(chatRef, {
            type: 'direct',
            members: membersMap,
            createdAt: now,
            updatedAt: now,
        });

        // 2. Create chat summaries for each user
        const summaryForUser1Ref = db.doc(`userChats/${userId1}/summaries/${chatId}`);
        batch.set(summaryForUser1Ref, {
            type: 'direct',
            otherMemberId: userId2,
            otherMemberName: user2Data?.name || 'Unknown',
            otherMemberAvatar: user2Data?.avatarUrl || null,
            updatedAt: now,
            unreadCount: 0,
        });
        
        const summaryForUser2Ref = db.doc(`userChats/${userId2}/summaries/${chatId}`);
        batch.set(summaryForUser2Ref, {
            type: 'direct',
            otherMemberId: userId1,
            otherMemberName: user1Data?.name || 'Unknown',
            otherMemberAvatar: user1Data?.avatarUrl || null,
            updatedAt: now,
            unreadCount: 0,
        });
        
        await batch.commit();

        return chatId;
    }
}
