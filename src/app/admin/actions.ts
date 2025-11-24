
'use server';

import { getAuthAdmin, getDb } from '@/lib/firebase/firebase-admin-sdk';
import { setDoc, doc } from 'firebase/firestore';


/**
 * Assigns the 'admin' role to a specific user and sets custom claims.
 * This is intended as a one-off setup action.
 * 
 * @param uid The UID of the user to make an admin.
 * @returns An object indicating success or failure.
 */
export async function setInitialAdmin(uid: string): Promise<{ success: boolean; message: string }> {
  try {
    const db = await getDb();
    
    // 1. Set the user's role in the Firestore 'users' collection.
    const userRef = db.collection('users').doc(uid);
    await userRef.set({ role: 'admin' }, { merge: true });

    // 2. Set custom claims on the user's authentication token.
    // This makes the 'admin' role available on the client-side immediately after login.
    const auth = await getAuthAdmin();
    await auth.setCustomUserClaims(uid, { role: 'admin' });

    console.log(`Successfully assigned 'admin' role to user ${uid}`);
    return { success: true, message: `User ${uid} is now an administrator.` };

  } catch (error: any) {
    console.error("Error setting initial admin:", error);
    return { success: false, message: `Failed to set admin role: ${error.message}` };
  }
}

