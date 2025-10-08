"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onIdTokenChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUserFromSession } from '@/app/auth/actions';

// Define a more generic user type that can be a Client or a full User
type AuthUser = (import('@/lib/types').User & { uid: string }) | (import('@/lib/types').Client & { uid: string });

type AuthContextType = {
    user: AuthUser | null;
    loading: boolean;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            const idToken = await firebaseUser?.getIdToken() || null;
            
            // Update the server-side session cookie
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
            
            // If the user is logged out in Firebase, update the state
            if (!firebaseUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            // If the user is logged in, fetch the full user profile from our backend
            try {
                const userDetails = await getCurrentUserFromSession();
                setUser(userDetails as AuthUser | null);
            } catch (error) {
                console.error("Error fetching user session details:", error);
                setUser(null); // Ensure user is null on error
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    const value = { user, loading, logout };

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
