
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAuth, onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import { getDb } from '@/lib/firebase-admin';
import type { User, Client } from '@/lib/types';
import { PERMISSIONS } from '@/lib/permissions';
import { app } from '@/lib/firebase';

type AuthUser = (User & { uid: string; permissions: string[] }) | (Client & { uid:string; permissions: never[] });

type AuthContextType = {
    user: AuthUser | null;
    loading: boolean;
    setAuthLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
    reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth(app);

    const fetchUserDetails = useCallback(async (firebaseUser: FirebaseUser) => {
        try {
            const db = await getDb();
            const idTokenResult = await firebaseUser.getIdTokenResult();
            const userEmail = firebaseUser.email;

            if (!userEmail) {
                // This can happen with phone auth, handle appropriately
                console.warn("User does not have an email.");
                // For now, let's assume we can't fetch details without email
                 throw new Error("User email is not available.");
            }

            const usersRef = db.collection('users');
            const querySnapshot = await usersRef.where('email', '==', userEmail).limit(1).get();
            
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data() as User;
                
                if (userData.status !== 'active') throw new Error("User account is not active.");

                const userRole = idTokenResult.claims.role || userData.role;
                let permissions: string[] = [];
                if (userRole === 'admin') {
                    permissions = Object.keys(PERMISSIONS);
                } else if (userRole) {
                    const roleDoc = await db.collection('roles').doc(userRole).get();
                    if (roleDoc.exists) permissions = roleDoc.data()?.permissions || [];
                }
                
                setUser({ ...userData, uid: firebaseUser.uid, permissions });
            } else {
                // Fallback to check clients collection if no user found
                const clientsRef = db.collection('clients');
                const clientQuerySnapshot = await clientsRef.where('email', '==', userEmail).limit(1).get();
                if (!clientQuerySnapshot.empty) {
                    const clientDoc = clientQuerySnapshot.docs[0];
                    const clientData = clientDoc.data() as Client;
                    if (clientData.status !== 'active') throw new Error("Client account is not active.");
                     // Clients don't have permissions in this model
                    setUser({ ...clientData, uid: firebaseUser.uid, permissions: [] });
                } else {
                     throw new Error(`No user or client record found for email: ${userEmail}`);
                }
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
            // Sign out the user if fetching details fails, to prevent an inconsistent state
            await auth.signOut();
            setUser(null);
        } finally {
            // ALWAYS set loading to false
            setLoading(false);
        }
    }, [auth]);

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setLoading(true);
                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: await firebaseUser.getIdToken() }),
                });
                await fetchUserDetails(firebaseUser);
            } else {
                await fetch('/api/auth/session', { method: 'POST', body: JSON.stringify({ idToken: null }) });
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [auth, fetchUserDetails]);
    
    const logout = async () => {
        setLoading(true);
        await auth.signOut();
        // onIdTokenChanged will handle setting user to null, clearing session, and setting loading to false
    };
    
    const reloadUser = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setLoading(true);
            await currentUser.getIdToken(true); // Force refresh
            await fetchUserDetails(currentUser);
        }
    }, [auth, fetchUserDetails]);

    const value = { user, loading, setAuthLoading: setLoading, logout, reloadUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
