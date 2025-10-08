
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAuth, onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import type { User, Client } from '@/lib/types';
import { app } from '@/lib/firebase';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { useToast } from '@/hooks/use-toast';

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
    const { toast } = useToast();

    const fetchAndSetUser = useCallback(async () => {
        try {
            const userDetails = await getCurrentUserFromSession();
            setUser(userDetails as AuthUser | null);
        } catch (error) {
            console.error("Error fetching user details:", error);
            toast({
                title: "خطأ في جلب بيانات الجلسة",
                description: "حدث خطأ أثناء محاولة تحميل بيانات المستخدم. قد تحتاج إلى تسجيل الدخول مرة أخرى.",
                variant: "destructive",
            });
            setUser(null);
        } finally {
             setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            const idToken = await firebaseUser?.getIdToken() || null;
            
            try {
                const response = await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to update server session.');
                }
                
                await fetchAndSetUser();

            } catch (error: any) {
                 console.error("Session update/fetch error:", error);
                 toast({
                    title: "خطأ في الجلسة",
                    description: error.message,
                    variant: "destructive",
                });
                await auth.signOut(); // Force sign out if session is invalid
                setUser(null);
                setLoading(false);
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [auth, fetchAndSetUser, toast]);
    
    const logout = async () => {
        setLoading(true);
        await auth.signOut();
    };
    
    const reloadUser = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            await currentUser.getIdToken(true);
        }
        await fetchAndSetUser();
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
