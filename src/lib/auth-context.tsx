'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  getIdToken,
  signInWithCustomToken,
} from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, writeBatch, increment } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, Client, Permission } from '@/lib/types';
import { createSessionCookie, getCurrentUserFromSession, logoutUser, signInAsUser as signInAsUserAction } from '@/app/(auth)/actions';
import { useRouter, usePathname } from 'next/navigation';
import { hasPermission as checkUserPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/auth/permissions';
import Preloader from '@/components/layout/preloader';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: (User & { permissions?: string[] }) | (Client & { isClient: true }) | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInAsUser: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof typeof PERMISSIONS) => boolean;
  revalidateUser: () => Promise<void>;
  unreadChatCount: number;
  error: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin', '/'];
const clientRoutes = ['/clients', '/profile']; // Routes accessible by clients

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const pathname = usePathname();
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

  useEffect(() => {
    const initializeAuth = async () => {
        try {
            const sessionUser = await getCurrentUserFromSession();
            if (sessionUser) {
                setUser(sessionUser);
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    initializeAuth();
  }, []);
  
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await getIdToken(userCredential.user, true); // Force refresh
      
      const result = await createSessionCookie(idToken);
       if (result.error || !result.success || !result.user) {
          throw new Error(result.error || "Failed to create session or retrieve user data.");
      }
      
      setUser(result.user);
      setLoading(false);
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

   const signInAsUser = async (userId: string) => {
    try {
        const { success, customToken, error } = await signInAsUserAction(userId);
        if (success && customToken) {
            await signInWithCustomToken(auth, customToken);
            const idToken = await getIdToken(auth.currentUser!, true); // Force refresh
            const sessionResult = await createSessionCookie(idToken);
            if (sessionResult.error || !sessionResult.user) throw new Error(sessionResult.error || "Failed to establish session for user.");

            setUser(sessionResult.user);
        } else {
            throw new Error(error || "Failed to get custom token.");
        }
    } catch (error: any) {
        console.error(`Sign in as user ${userId} failed:`, error);
    }
  };


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
      <AuthContext.Provider value={{ user, loading, signIn, signOut, hasPermission, signInAsUser, revalidateUser, unreadChatCount, error }}>
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
