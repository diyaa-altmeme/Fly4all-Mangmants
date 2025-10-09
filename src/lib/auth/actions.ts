
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

const getUserData = async (uid: string): Promise<any | null> => {
    const db = await getDb();
    if (!db) {
        return { exists: false, error: "Database connection failed." };
    }

    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        let permissions: string[] = [];
        const userRole = userData.role || 'viewer';

        if (userRole === 'admin') {
            permissions = Object.keys(PERMISSIONS);
        } else {
            const roleDocRef = doc(db, 'roles', userRole);
            const roleDoc = await getDoc(roleDocRef);
            if (roleDoc.exists()) {
                permissions = (roleDoc.data() as Role).permissions || [];
            }
        }
        
        return {
            uid,
            name: userData.name || null,
            username: userData.username || null,
            email: userData.email || null,
            phone: userData.phone || null,
            avatarUrl: userData.avatarUrl || null,
            status: userData.status || 'pending',
            role: userRole,
            department: userData.department || null,
            position: userData.position || null,
            boxId: userData.boxId || null,
            permissions,
            exists: true,
        };
    }
    
    const clientDocRef = doc(db, 'clients', uid);
    const clientDoc = await getDoc(clientDocRef);
    if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        return { 
            id: uid, 
            isClient: true, 
            permissions: [],
            name: clientData.name || null,
            email: clientData.email || null,
            phone: clientData.phone || null,
            avatarUrl: clientData.avatarUrl || null,
            status: clientData.status || 'active',
            exists: true,
         }; 
    }

    return { exists: false, error: "لم يتم العثور على بيانات للمستخدم في قاعدة البيانات." };
}

export async function createSession(idToken: string): Promise<{ success: boolean; user?: any; error?: string }> {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    
    try {
        const decodedIdToken = await getAuth().verifyIdToken(idToken);
        const userVerification = await getUserData(decodedIdToken.uid);

        if (!userVerification || !userVerification.exists) {
             throw new Error(userVerification.error || "فشل التحقق من المستخدم.");
        }

        if (userVerification.status !== 'active') {
            throw new Error("الحساب غير نشط أو محظور.");
        }

        const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
        
        cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        });

        return { success: true, user: userVerification };

    } catch (error: any) {
        console.error("Error creating session:", error);
        return { success: false, error: error.message };
    }
}


export async function clearSession() {
    cookies().delete(SESSION_COOKIE_NAME);
}


export async function getCurrentUserFromSession(): Promise<(User & { permissions: (keyof typeof PERMISSIONS)[] }) | (Client & { isClient: true, permissions: (keyof typeof PERMISSIONS)[] }) | null> {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie?.value) {
        return null;
    }

    try {
        const decodedClaims = await getAuth().verifySessionCookie(sessionCookie.value, true);
        const userData = await getUserData(decodedClaims.uid);
        
        if (!userData || !userData.exists) {
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


export async function verifyUserByEmail(email: string): Promise<{ exists: boolean; type?: 'user' | 'client', uid?: string, error?: string, status?: string }> {
    const db = await getDb();
    if (!db) {
        return { exists: false, error: "Database connection failed." };
    }
    try {
        const usersQuery = query(collection(db, "users"), where("email", "==", email));
        const usersSnapshot = await getDocs(usersQuery);

        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            return { exists: true, type: 'user', uid: userDoc.id, status: userDoc.data().status || 'pending' };
        }

        const clientsQuery = query(collection(db, "clients"), where("loginIdentifier", "==", email));
        const clientsSnapshot = await getDocs(clientsQuery);
        
        if (!clientsSnapshot.empty) {
             const clientDoc = clientsSnapshot.docs[0];
             return { exists: true, type: 'client', uid: clientDoc.id, status: clientDoc.data().status || 'inactive' };
        }

        return { exists: false, error: "المستخدم غير مسجل في قاعدة البيانات." };
    } catch (error: any) {
        console.error("Error verifying user by email:", error);
        return { exists: false, error: "حدث خطأ أثناء التحقق من المستخدم." };
    }
}
