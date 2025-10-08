"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onIdTokenChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { useToast } from '@/hooks/use-toast';

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

    const handleUserSession = useCallback(async (firebaseUser: FirebaseUser | null) => {
        try {
            const idToken = await firebaseUser?.getIdToken() || null;
            
            // Update the server-side session cookie. This is crucial for Server Actions.
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (!firebaseUser) {
                setUser(null);
                setLoading(false); // Make sure to set loading to false
                return;
            }

            // If user is logged in, fetch full profile from our backend.
            const userDetails = await getCurrentUserFromSession();
            
            if (!userDetails) {
                await signOut(auth);
                setUser(null);
                toast({
                    title: "خطأ في مزامنة الحساب",
                    description: "لم نتمكن من العثور على ملفك الشخصي في قاعدة البيانات. تم تسجيل خروجك.",
                    variant: "destructive",
                });
                return;
            }

            const safeUserDetails = JSON.parse(JSON.stringify(userDetails));
            setUser(safeUserDetails as AuthUser | null);

        } catch (error) {
            console.error("Auth State Error:", error);
            await signOut(auth);
            setUser(null);
            toast({
                title: "حدث خطأ في المصادقة",
                description: "تم تسجيل خروجك بسبب خطأ. الرجاء المحاولة مرة أخرى.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);


    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, handleUserSession);
        return () => unsubscribe();
    }, [handleUserSession]);

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
