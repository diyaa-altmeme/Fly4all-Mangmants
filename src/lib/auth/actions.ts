
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

export async function createSession(idToken: string): Promise<any> {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    
    try {
        const decodedIdToken = await getAuth().verifyIdToken(idToken);
        
        // Ensure user exists and is active before creating a session.
        const userVerification = await verifyUserByEmail(decodedIdToken.email || '');
        if (!userVerification.exists) {
          throw new Error(userVerification.error || "المستخدم غير موجود أو بيانات الدخول غير صحيحة.");
        }
      
        if (userVerification.status !== 'active') {
          throw new Error("الحساب غير مفعل أو محظور.");
        }

        const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
        
        cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        });

        // After setting the cookie, fetch the full user data to return to the client.
        const userData = await getUserData(decodedIdToken.uid);
        return { success: true, user: userData };

    } catch (error: any) {
        console.error("Error creating session:", error);
        return { success: false, error: error.message };
    }
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
            
            // Return a plain object, safe for client components
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
             }; 
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


export async function verifyUserByEmail(email: string): Promise<{ exists: boolean; type?: 'user' | 'client', uid?: string, error?: string, status?: string }> {
    try {
        const db = await getDb();

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
