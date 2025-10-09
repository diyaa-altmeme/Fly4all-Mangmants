
'use server';

import { getDb } from "@/lib/firebase-admin";
import { ensureRolesExist } from "@/lib/roles";
import { getAuth } from "firebase-admin/auth";
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
    
    // 1. Ensure all necessary roles, including 'admin', exist in Firestore.
    await ensureRolesExist();

    // 2. Set the user's role in the Firestore 'users' collection.
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { role: 'admin' }, { merge: true });

    // 3. Set custom claims on the user's authentication token.
    // This makes the 'admin' role available on the client-side immediately after login.
    await getAuth().setCustomUserClaims(uid, { role: 'admin' });

    console.log(`Successfully assigned 'admin' role to user ${uid}`);
    return { success: true, message: `User ${uid} is now an administrator.` };

  } catch (error: any) {
    console.error("Error setting initial admin:", error);
    return { success: false, message: `Failed to set admin role: ${error.message}` };
  }
}
