
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  getIdToken,
  onAuthStateChanged,
  type User as AuthUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User, Client, Permission } from '@/lib/types';
import { createSessionCookie, getCurrentUserFromSession, logoutUser } from '@/app/(auth)/actions';
import { useRouter } from 'next/navigation';
import { hasPermission as checkUserPermission } from '@/lib/auth/permissions';
import { PERMISSIONS } from '@/lib/auth/permissions';
import Preloader from '@/components/layout/preloader';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, writeBatch, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  const lastNotificationTimestamp = React.useRef(Date.now());


  const revalidateUser = useCallback(async () => {
    try {
        const sessionUser = await getCurrentUserFromSession();
        setUser(sessionUser);
    } catch (error) {
        console.error("Failed to revalidate user session:", error);
        setUser(null); // Clear user on error
    }
  }, []);

  const setupSession = useCallback(async (authUser: AuthUser) => {
    try {
        const idToken = await getIdToken(authUser, true); // Force refresh
        const { error } = await createSessionCookie(idToken);
        if (error) {
            throw new Error(error);
        }
        await revalidateUser(); // Fetch full user data from server after setting cookie
    } catch (error) {
        console.error("Auth session setup error:", error);
        setUser(null); // Clear user on error
    } finally {
        setLoading(false);
    }
  }, [revalidateUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        if (authUser) {
            setupSession(authUser);
        } else {
             setUser(null);
             setLoading(false);
        }
    });
    return () => unsubscribe();
  }, [setupSession]);
  
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
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest
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
        setLoading(false); // Make sure loading is set to false on error
        return { success: false, error: errorMessage };
    }
  }

  const signOut = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    await logoutUser(); // Clears server-side cookie
    setUser(null);
    window.location.href = '/'; // Force a full page reload to the landing page
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
