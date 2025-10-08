
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onIdTokenChanged, signOut, User as FirebaseUser, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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
    const { toast } = useToast();
    const router = useRouter();

    const handleUserSession = useCallback(async (firebaseUser: FirebaseUser | null) => {
        setLoading(true);
        if (firebaseUser) {
            try {
                // Ensure session cookie is set before fetching user data
                const idToken = await getIdToken(firebaseUser);
                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                });

                const sessionUser = await getCurrentUserFromSession();
                setUser(sessionUser);
            } catch (error) {
                console.error("Error handling user session:", error);
                await signOut(auth);
                setUser(null);
            }
        } else {
            // Clear session cookie on sign out
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: null }),
            });
            setUser(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, handleUserSession, (error) => {
            console.error("Auth state error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [handleUserSession]);

    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            // The onIdTokenChanged listener will handle clearing the session
        } catch (error) {
            console.error("Error signing out:", error);
            toast({
                title: "خطأ في تسجيل الخروج",
                variant: "destructive"
            });
        }
    }, [toast]);

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
