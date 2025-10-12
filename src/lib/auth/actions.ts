

'use server';

import { getDb, getAuthAdmin } from '@/lib/firebase-admin';
import type { User, Client, LoginCredentials } from '@/lib/types';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getRoles } from '@/app/users/actions';
import { PERMISSIONS } from './permissions';
import { redirect } from 'next/navigation';

export const getUserById = cache(async (uid: string): Promise<(User & { permissions?: string[] }) | null> => {
    const db = await getDb();
    if (!db) return null;
    
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return null;

        const userData = userDoc.data() as User;
        
        const allRoles = await getRoles();
        let permissions: string[] = [];

        if (userData.role) {
            if(userData.role === 'admin') {
                // Admin gets all permissions implicitly from the defined roles list.
                 permissions = Object.keys(PERMISSIONS);
            } else {
                const userRole = allRoles.find(r => r.id === userData.role);
                if (userRole) {
                    permissions = userRole.permissions || [];
                }
            }
        }
        
        return { ...userData, uid, permissions: [...new Set(permissions)] };
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        return null;
    }
});

export const getClientById = cache(async (id: string): Promise<Client | null> => {
    const db = await getDb();
    if (!db) return null;

    try {
        const doc = await db.collection('clients').doc(id).get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data() as any;
        
        const safeData = JSON.parse(JSON.stringify(data, (key, value) => {
            if (value && typeof value === 'object' && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
                return new Date(value.seconds * 1000).toISOString();
            }
            return value;
        }));

        return {
            id: doc.id,
            ...safeData,
        } as Client;
    } catch (error) {
        console.error(`Error getting client by ID ${''}${id}:`, String(error));
        return null;
    }
});

export const getCurrentUserFromSession = cache(async (): Promise<(User & { permissions?: string[] }) | (Client & { isClient: true }) | null> => {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) return null;

    try {
        const authAdmin = await getAuthAdmin();
        const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie.value, true);
        
        const fullUser = await getUserById(decodedClaims.uid);
        if (fullUser) {
            return fullUser;
        }
        
        if (decodedClaims.isClient) {
             const client = await getClientById(decodedClaims.uid);
             if (client) return { ...client, isClient: true };
        }
        
        console.warn(`Session cookie for UID ${decodedClaims.uid} is valid, but user not found in Firestore. Logging out.`);
        cookies().delete('session');
        return null;

    } catch (error) {
        cookies().delete('session');
        return null;
    }
});


export async function createSessionCookie(idToken: string): Promise<{ success: boolean; user?: User & { permissions?: string[] }; error?: string }> {
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days
    const authAdmin = await getAuthAdmin();
    
    try {
        const decodedToken = await authAdmin.verifyIdToken(idToken, true); // Check if revoked
        
        const userInDb = await getUserById(decodedToken.uid);
        if (!userInDb) {
            throw new Error("User not found in database.");
        }

        const currentClaims = decodedToken;
        if (currentClaims.role !== userInDb?.role) {
            await authAdmin.setCustomUserClaims(decodedToken.uid, { role: userInDb?.role || 'viewer' });
        }

        const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
        
        const cookieStore = await cookies();
        cookieStore.set('session', sessionCookie, {
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax', 
        });

        return { success: true, user: userInDb };
    } catch (error: any) {
        console.error("Error creating session cookie:", error);
        return { success: false, error: error.message };
    }
}

export async function createOtpSessionCookie(sessionPayload: any): Promise<void> {
    const expiresIn = 60 * 60 * 24 * 7; // 7 days in seconds
    const cookieStore = await cookies();
    cookieStore.set('session', JSON.stringify(sessionPayload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: expiresIn,
        path: '/',
        sameSite: 'lax',
    });
}

export const getUserByEmail = cache(async (email: string): Promise<(User) | null> => {
    const db = await getDb();
    if (!db) return null;

    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return null;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as Omit<User, 'uid' | 'permissions'>;
        
        return { ...userData, uid: userDoc.id };

    } catch (error) {
        console.error("Error getting user by email:", error);
        return null;
    }
});


export async function loginUser(idToken: string) {
    return await createSessionCookie(idToken);
}

export async function signInAsUser(userId: string): Promise<{ success: boolean; customToken?: string; error?: string }> {
    const authAdmin = await getAuthAdmin();
    try {
        const customToken = await authAdmin.createCustomToken(userId);
        return { success: true, customToken };
    } catch (error: any) {
        console.error("Error creating custom token for user:", error);
        return { success: false, error: error.message };
    }
}


export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    // The redirect will now be handled client-side in the useAuth hook
    // for a full page reload.
}
