"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAuth, onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import type { User, Client, Role } from '@/lib/types';
import { PERMISSIONS } from '@/lib/permissions';
import { app } from '@/lib/firebase';
import { getDb } from '@/lib/firebase-admin';
import { cleanUser } from '@/lib/cleanUser';


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
            const idTokenResult = await firebaseUser.getIdTokenResult();
            const userEmail = firebaseUser.email;

            if (!userEmail) {
                console.warn("User does not have an email.");
                throw new Error("User email is not available.");
            }
            
            const safeUser = cleanUser(firebaseUser);

            // This is a simplified fetch. In a real app, you'd call a server action.
            // For now, we'll assume the basic firebaseUser info is enough.
            // The key is that `safeUser` is a plain object.
             setUser({
                ...safeUser,
                // You would fetch and merge more user details from your DB here
                // For example: role, permissions, etc.
                permissions: [],
             } as any);

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
                const idToken = await firebaseUser.getIdToken();
                // Create session cookie on the server
                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                });
                const safeUser = cleanUser(firebaseUser);
                setUser(safeUser as any); // Assuming safeUser is compatible with AuthUser
            } else {
                // Clear session cookie on the server
                await fetch('/api/auth/session', { method: 'POST', body: JSON.stringify({ idToken: null }) });
                setUser(null);
            }
             setLoading(false);
        });

        return () => unsubscribe();
    }, [auth]);
    
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
