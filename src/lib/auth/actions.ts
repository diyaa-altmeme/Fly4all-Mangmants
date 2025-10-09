
'use server';

import { getAuth } from 'firebase-admin/auth';
import { getDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User, Client, Role } from '@/lib/types';
import { PERMISSIONS } from '@/lib/permissions';

const SESSION_COOKIE_NAME = '__session';

async function getSessionCookie() {
    try {
        const cookieStore = cookies();
        return cookieStore.get(SESSION_COOKIE_NAME);
    } catch (error) {
        console.log('Error reading cookies, probably running in a non-request context.');
        return null;
    }
}

export async function createSession(idToken: string) {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    });
}

export async function clearSession() {
    cookies().delete(SESSION_COOKIE_NAME);
}

const getUserData = async (uid: string): Promise<any | null> => {
    try {
        const db = await getDb();
        
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            let permissions: string[] = [];

            if (userData.role) {
                if (userData.role === 'admin') {
                    permissions = Object.keys(PERMISSIONS);
                } else {
                    const roleDocRef = doc(db, 'roles', userData.role);
                    const roleDoc = await getDoc(roleDocRef);
                    if (roleDoc.exists()) {
                        permissions = (roleDoc.data() as Role).permissions || [];
                    }
                }
            }
            return { ...userData, uid, permissions };
        }
        
        const clientDocRef = doc(db, 'clients', uid);
        const clientDoc = await getDoc(clientDocRef);
        if (clientDoc.exists()) {
            return { ...clientDoc.data(), id: uid, isClient: true, permissions: [] }; 
        }

        return null;
    } catch (error) {
        console.error("Error fetching user data from Firestore:", error);
        return null;
    }
}

export async function getCurrentUserFromSession(): Promise<(User & { permissions: (keyof typeof PERMISSIONS)[] }) | (Client & { isClient: true, permissions: (keyof typeof PERMISSIONS)[] }) | null> {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie?.value) {
        return null;
    }

    try {
        const decodedClaims = await getAuth().verifySessionCookie(sessionCookie.value, true);
        const userData = await getUserData(decodedClaims.uid);
        
        if (!userData) {
            console.warn(`User data not found in Firestore for UID: ${decodedClaims.uid}`);
            return null;
        }

        return userData;

    } catch (error: any) {
        if (error.code === 'auth/session-cookie-expired') {
            console.log('Session cookie expired, clearing...');
            await clearSession();
        } else {
            console.error('Error verifying session cookie:', error);
        }
        return null;
    }
}


export async function verifyUserByEmail(email: string): Promise<{ exists: boolean; type?: 'user' | 'client', error?: string, status?: string }> {
    try {
        const db = await getDb();
        // Check 'users' collection
        const usersQuery = query(collection(db, "users"), where("email", "==", email));
        const usersSnapshot = await getDocs(usersQuery);

        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0].data();
            return { exists: true, type: 'user', status: userDoc.status || 'pending' };
        }

        // Check 'clients' collection using loginIdentifier
        const clientsQuery = query(collection(db, "clients"), where("loginIdentifier", "==", email));
        const clientsSnapshot = await getDocs(clientsQuery);
        
        if (!clientsSnapshot.empty) {
             const clientDoc = clientsSnapshot.docs[0].data();
             return { exists: true, type: 'client', status: clientDoc.status || 'inactive' };
        }

        return { exists: false };
    } catch (error: any) {
        console.error("Error verifying user by email:", error);
        return { exists: false, error: "حدث خطأ أثناء التحقق من المستخدم." };
    }
}
