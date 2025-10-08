"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAuth, onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import type { User, Client } from '@/lib/types';
import { app } from '@/lib/firebase';
import { getCurrentUserFromSession } from '@/app/auth/actions';

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

    const fetchAndSetUser = useCallback(async () => {
        try {
            const userDetails = await getCurrentUserFromSession();
            if (userDetails) {
                setUser(userDetails as AuthUser);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Error fetching and setting user:", error);
            setUser(null);
        } finally {
             setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const idToken = await firebaseUser.getIdToken();
                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                });
            } else {
                await fetch('/api/auth/session', { method: 'POST', body: JSON.stringify({ idToken: null }) });
            }
            // After auth state changes (login/logout), always refetch the full user profile
            await fetchAndSetUser();
        });

        return () => unsubscribe();
    }, [auth, fetchAndSetUser]);
    
    const logout = async () => {
        setLoading(true);
        await auth.signOut();
        // The onIdTokenChanged listener will handle setting user to null and clearing session
    };
    
    const reloadUser = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            await currentUser.getIdToken(true); // Force refresh
        }
        await fetchAndSetUser(); // Then refetch the full profile
    }, [auth, fetchAndSetUser]);

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
