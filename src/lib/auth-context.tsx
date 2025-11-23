
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  getIdToken,
  onIdTokenChanged,
  type User as AuthUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User, Client, Permission } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { hasPermission as checkUserPermission, PERMISSIONS } from '@/lib/auth/permissions';
import Preloader from '@/components/layout/preloader';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, writeBatch, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUserFromSession } from '@/app/(auth)/actions';


// Server-side action imports
async function createSessionCookie(idToken: string) {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ idToken }),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to create session cookie: ${res.statusText} - ${errorText}`);
    }

    return res.json();
}


async function logoutUserOnServer() {
    await fetch("/api/auth/logout", { method: "POST" });
}

async function checkSessionOnServer(): Promise<{ authenticated: boolean; user?: any }> {
    try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) {
            return { authenticated: false };
        }
        const data = await res.json();
        return data;
    } catch {
        return { authenticated: false };
    }
}


interface AuthContextType {
  user: (User & { permissions?: string[] }) | (Client & { isClient: true }) | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof typeof PERMISSIONS) => boolean;
  revalidateUser: () => Promise<void>;
  unreadChatCount: number;
  error: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthContextType['user'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const { toast } = useToast();
    const router = useRouter();
    const lastNotificationTimestamp = React.useRef(Date.now());


    const revalidateUser = useCallback(async () => {
        try {
            const sessionUser = await getCurrentUserFromSession();
            setUser(sessionUser || null);
        } catch (error) {
            console.error("Failed to revalidate user session:", error);
            setUser(null);
        }
    }, []);

    const setupSession = useCallback(async (authUser: AuthUser) => {
        try {
            const idToken = await getIdToken(authUser, true); // Force refresh
            const { error } = await createSessionCookie(idToken);
            if (error) {
                throw new Error(error);
            }
            await revalidateUser();
        } catch (error: any) {
            console.error("Auth session setup error:", error);
            setError(error.message);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [revalidateUser]);
    
    // Initial load and session check
    useEffect(() => {
        revalidateUser().finally(() => setLoading(false));
    }, [revalidateUser]);


    // Listen for client-side auth state changes to sync server session
    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (authUser) => {
            if (authUser) {
                // If there's a client-side user but potentially no server-side session yet
                if (!user) {
                    await setupSession(authUser);
                }
            } else {
                await logoutUserOnServer();
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, [setupSession, user]);
  
    useEffect(() => {
        if (!user || !('uid' in user)) {
            setUnreadChatCount(0);
            return;
        };
        
        const q = query(collection(db, `userChats/${user.uid}/summaries`));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            let totalUnread = 0;
            const now = Date.now();
            querySnapshot.docChanges().forEach((change) => {
                if (change.type === "modified") {
                    const chatData = change.doc.data();
                    if (chatData.lastMessage && chatData.lastMessage.senderId !== user.uid) {
                         if (now - lastNotificationTimestamp.current > 3000) {
                            toast({
                                title: `رسالة جديدة من ${chatData.otherMemberName}`,
                                description: chatData.lastMessage.text,
                            });
                            lastNotificationTimestamp.current = now;
                        }
                    }
                }
            });
            
            querySnapshot.forEach((doc) => {
                totalUnread += doc.data().unreadCount || 0;
            });
            setUnreadChatCount(totalUnread);
        });

        return () => unsubscribe();
    }, [user, toast]);


    const signIn = async (email: string, password: string): Promise<{ success: boolean, error?: string}> => {
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            setLoading(true); // Set loading while session is being set up
            await setupSession(userCredential.user);
            return { success: true };

        } catch (error: any) {
            console.error("Sign in failed:", error);
            let errorMessage = "An unexpected error occurred.";
            if (error.code) {
              switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                  errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                  break;
                case 'auth/invalid-email':
                  errorMessage = 'صيغة البريد الإلكتروني غير صحيحة.';
                  break;
                default:
                  errorMessage = error.message;
              }
            } else {
                errorMessage = error.message;
            }
            setError(errorMessage);
            setLoading(false);
            return { success: false, error: errorMessage };
        }
    }

    const signOut = async () => {
        await firebaseSignOut(auth); // This will trigger onIdTokenChanged
    };

    const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
        if (!user || ('isClient' in user && user.isClient)) return false;
        return checkUserPermission(user, permission);
    }
    
    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, hasPermission, revalidateUser, unreadChatCount, error }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
