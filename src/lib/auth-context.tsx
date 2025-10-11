
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  getIdToken,
  signInWithCustomToken,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User, Client, Permission } from '@/lib/types';
import { getCurrentUserFromSession, loginUser, logoutUser, signInAsUser as signInAsUserAction } from '@/lib/auth/actions';
import { useRouter, usePathname } from 'next/navigation';
import { hasPermission as checkUserPermission } from '@/lib/permissions';
import { PERMISSIONS } from './auth/permissions';
import Preloader from '@/components/layout/preloader';

interface AuthContextType {
  user: (User & { permissions?: string[] }) | (Client & { isClient: true }) | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInAsUser: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof typeof PERMISSIONS) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin', '/'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route) && (route === '/' ? pathname.length === 1 : true));

  useEffect(() => {
    const initializeAuth = async () => {
        try {
            const sessionUser = await getCurrentUserFromSession();
            if (sessionUser) {
                setUser(sessionUser);
            } else if (!isPublicRoute) {
                router.replace('/auth/login');
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
            setUser(null);
            if (!isPublicRoute) router.replace('/auth/login');
        } finally {
            setLoading(false);
        }
    };

    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);


  const signIn = async (email: string, password: string): Promise<{ success: boolean, error?: string}> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await getIdToken(userCredential.user);
      
      const result = await loginUser(idToken);
       if (result.error || !result.success || !result.user) {
          throw new Error(result.error || "Failed to create session or retrieve user data.");
      }
      
      setUser(result.user);
      router.replace('/dashboard'); // Use replace to avoid adding a new entry to the history stack.
      
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
        return { success: false, error: errorMessage };
    }
  }

   const signInAsUser = async (userId: string) => {
    try {
        const { success, customToken, error } = await signInAsUserAction(userId);
        if (success && customToken) {
            await signInWithCustomToken(auth, customToken);
            const idToken = await getIdToken(auth.currentUser!, true); // Force refresh
            const sessionResult = await loginUser(idToken);
            if (sessionResult.error || !sessionResult.user) throw new Error(sessionResult.error || "Failed to establish session for user.");

            setUser(sessionResult.user);
            router.replace('/dashboard');
        } else {
            throw new Error(error || "Failed to get custom token.");
        }
    } catch (error: any) {
        console.error(`Sign in as user ${userId} failed:`, error);
        // Handle error display to the user if necessary
    }
  };


  const signOut = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    await logoutUser(); // Clears server-side cookie
    setUser(null);
    router.push('/auth/login');
  };

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    if (!user || ('isClient' in user && user.isClient)) return false;
    return checkUserPermission(user, permission);
  }
  
  if (loading) {
    return <Preloader />;
  }
  
  if (isPublicRoute || user) {
     return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, hasPermission, signInAsUser }}>
        {children}
        </AuthContext.Provider>
    );
  }
  
  // This should theoretically not be reached often if redirects are working
  return <Preloader />;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
