
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
        if (firebaseUser) {
            try {
                const sessionUser = await getCurrentUserFromSession();
                if (sessionUser) {
                    setUser(sessionUser);
                } else {
                    toast({
                        title: "خطأ في مزامنة الحساب",
                        description: "لم يتم العثور على ملف تعريف المستخدم. يتم تسجيل الخروج.",
                        variant: "destructive"
                    });
                    await signOut(auth);
                    setUser(null);
                }
            } catch (error) {
                console.error("Error fetching user session:", error);
                await signOut(auth);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setLoading(false);
    }, [toast]);

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
            setUser(null);
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
