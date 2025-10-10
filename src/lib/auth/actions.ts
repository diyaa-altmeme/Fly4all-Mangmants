
'use server';

import { getDb, getAuthAdmin } from '@/lib/firebase-admin';
import type { User, Client, LoginCredentials } from '@/lib/types';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getRoles } from '@/app/users/actions';
import { PERMISSIONS } from './permissions';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
        
        // Fetch user data from Firestore to get the role
        const userInDb = await getUserById(decodedToken.uid);

        // Set custom claims if they don't exist or are different
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

export async function loginUser(credentials: LoginCredentials) {
    try {
        // Since we can't use the client-side `signInWithEmailAndPassword` in a Server Action,
        // and we don't want to re-implement the logic, we will rely on the Admin SDK
        // to validate the user. This flow is less secure than the client-side SDK flow.
        // A better long-term solution is a custom backend endpoint.
        // For now, we will create a session from an ID token generated on the client,
        // which means the client form needs to get an ID token first.
        // This is complex. Let's simplify. We will trust the server action for now.

        // The correct way is to use the client SDK to sign in, get the idToken, and post that to a server action/route.
        // Let's assume the form now posts the idToken.
        
        const { email, password } = credentials;

        const authAdmin = getAuthAdmin();
        
        // This flow is NOT recommended as it bypasses many client-side checks.
        // But for the sake of making it work within the current server-action constraint:
        // Let's go back to the original plan. The client will sign in and the server will create the cookie.

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
            let errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
            if (result.error?.message === "INVALID_LOGIN_CREDENTIALS") {
                errorMessage = "بيانات الدخول غير صحيحة.";
            }
             return { error: errorMessage };
        }

        const idToken = result.idToken;
        
        const sessionResult = await createSessionCookie(idToken);
        if (!sessionResult.success) {
            return { error: sessionResult.error };
        }

    } catch (error: any) {
        console.error("Login Action Error: ", error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
    
    // Redirect to the dashboard after successful login
    redirect('/');
}


export async function logoutUser() {
    cookies().delete('session');
}
