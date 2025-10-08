
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAuth, onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import type { User, Client } from '@/lib/types';
import { PERMISSIONS } from '@/lib/permissions';
import { app } from '@/lib/firebase';
import { getDb } from '@/lib/firebase-admin';

type AuthUser = (User & { uid: string; permissions: string[] }) | (Client & { uid:string; permissions: never[] });

type AuthContextType = {
    user: AuthUser | null;
    loading: boolean;
    setAuthLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
    reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to process Firestore documents
const processDoc = (docData: any): any => {
    if (!docData) return null;

    const safeData = JSON.parse(JSON.stringify(docData));

    for (const key in safeData) {
        if (safeData[key] && (safeData[key].hasOwnProperty('_seconds') || typeof safeData[key].toDate === 'function')) {
            safeData[key] = new Date(safeData[key]._seconds * 1000 || safeData[key].toDate()).toISOString();
        }
    }
    return safeData;
};


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
                console.warn("User does not have an email.");
                 throw new Error("User email is not available.");
            }

            const usersRef = db.collection('users');
            const querySnapshot = await usersRef.where('email', '==', userEmail).limit(1).get();
            
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = processDoc(userDoc.data()) as User;
                
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
                const clientsRef = db.collection('clients');
                const clientQuerySnapshot = await clientsRef.where('email', '==', userEmail).limit(1).get();
                if (!clientQuerySnapshot.empty) {
                    const clientDoc = clientQuerySnapshot.docs[0];
                    const clientData = processDoc(clientDoc.data()) as Client;
                    if (clientData.status !== 'active') throw new Error("Client account is not active.");
                    setUser({ ...clientData, uid: firebaseUser.uid, permissions: [] });
                } else {
                     throw new Error(`No user or client record found for email: ${userEmail}`);
                }
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
            await auth.signOut();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [auth]);

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setLoading(true);
                // Create session cookie on the server
                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: await firebaseUser.getIdToken() }),
                });
                // Fetch user details from Firestore
                await fetchUserDetails(firebaseUser);
            } else {
                // Clear session cookie on the server
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
