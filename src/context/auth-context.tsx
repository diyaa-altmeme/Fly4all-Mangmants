
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
                return;
            }

            // If user is logged in, fetch full profile from our backend.
            // This is where we get roles and permissions.
            const userDetails = await getCurrentUserFromSession();
            
            if (!userDetails) {
                // This case can happen if auth exists but Firestore doc doesn't.
                // We log them out to force a clean state.
                await signOut(auth);
                setUser(null);
                toast({
                    title: "خطأ في مزامنة الحساب",
                    description: "لم نتمكن من العثور على ملفك الشخصي في قاعدة البيانات. تم تسجيل خروجك.",
                    variant: "destructive",
                });
                return;
            }

            // The user object MUST be a plain object to be passed from server to client components.
            const safeUserDetails = JSON.parse(JSON.stringify(userDetails));
            setUser(safeUserDetails as AuthUser | null);

        } catch (error) {
            console.error("Auth State Error:", error);
            await signOut(auth); // Force logout on any error
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
