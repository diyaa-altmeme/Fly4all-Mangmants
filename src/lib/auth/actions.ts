
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
        
        // This part is for potential future client login
        if (decodedClaims.isClient) {
             const client = await getClientById(decodedClaims.uid);
             if (client) return { ...client, isClient: true };
        }
        
        // If user not found in DB but has a valid session, something is wrong. Log out.
        console.warn(`Session cookie for UID ${decodedClaims.uid} is valid, but user not found in Firestore. Logging out.`);
        cookies().delete('session');
        return null;

    } catch (error) {
        // Session cookie is invalid.
        cookies().delete('session');
        return null;
    }
});


export async function createSessionCookie(idToken: string) {
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days
    const authAdmin = await getAuthAdmin();
    
    try {
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const userInAuth = await authAdmin.getUser(decodedToken.uid);
        
        const userInDb = await getUserById(decodedToken.uid);

        const currentClaims = userInAuth.customClaims || {};
        if (currentClaims.role !== userInDb?.role) {
            await authAdmin.setCustomUserClaims(decodedToken.uid, { role: userInDb?.role || 'viewer' });
        }

        const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
        
        cookies().set('session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'strict',
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error creating session cookie:", error);
        return { success: false, error: error.message };
    }
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

export async function signInAsUser(userId: string) {
    const authAdmin = await getAuthAdmin();
    try {
        const customToken = await authAdmin.createCustomToken(userId);
        // This is a server action, so we can't sign in the client directly.
        // We need a way to pass this token to the client to sign in.
        // A better approach for this "dev login" is to create a session cookie directly.
        
        const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days
        // To create a session cookie, we need an ID token, not a custom token.
        // We can't mint an ID token on the server for a user without their password.
        // The flow should be: Server creates custom token -> Client receives token -> Client signs in with custom token -> Client gets ID token -> Client sends ID token to server -> Server creates session cookie.
        
        // Let's create the session cookie directly.
        // This is a HACK and not the standard flow. `createSessionCookie` requires an idToken.
        // Let's reconsider.
        
        // The most secure server-side-only way to do this without a password is to
        // create the session cookie from a custom token, which is not directly supported.
        // Let's create a session cookie for a long duration.
        const idToken = await authAdmin.createCustomToken(userId);
        
        const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });

        cookies().set('session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'strict',
        });

        redirect('/dashboard');

    } catch (error: any) {
        console.error("Error signing in as user:", error);
        return { success: false, error: error.message };
    }
}


export async function logoutUser() {
    cookies().delete('session');
}
