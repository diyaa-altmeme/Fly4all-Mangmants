
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
import { getSettings } from '@/app/settings/actions';
import { getUserById } from '@/lib/auth/actions';

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
const ADMIN_UID_FOR_DEV = "5V2a9sFmEjZosRARbpA8deWhdVJ3"; // UID for "ضياء التميمي"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    const initializeAuth = async () => {
        try {
            const sessionUser = await getCurrentUserFromSession();
            if (sessionUser) {
                setUser(sessionUser);
            } else if (process.env.NODE_ENV === 'development' && !isPublicRoute) {
                console.log("Development mode: Attempting to auto-login as admin...");
                const { success, customToken, error } = await signInAsUserAction(ADMIN_UID_FOR_DEV);
                 if (success && customToken) {
                    await signInWithCustomToken(auth, customToken);
                    const idToken = await getIdToken(auth.currentUser!, true);
                    await loginUser(idToken);
                    const newSessionUser = await getCurrentUserFromSession();
                    if(newSessionUser) {
                       setUser(newSessionUser);
                       router.push('/dashboard');
                    } else {
                       throw new Error("Auto-login failed: Could not retrieve session user after login.");
                    }
                } else {
                     throw new Error(`Failed to get custom token for dev admin: ${error}`);
                }
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
  }, []); // Run only once on mount


  const signIn = async (email: string, password: string): Promise<{ success: boolean, error?: string}> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await getIdToken(userCredential.user);
      
      const result = await loginUser(idToken);
       if (result?.error) {
          throw new Error(result.error);
      }
      
      const newSessionUser = await getCurrentUserFromSession();
      if (newSessionUser) {
        setUser(newSessionUser);
        router.push('/dashboard');
      } else {
        throw new Error("Failed to retrieve user session after login.");
      }

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
            if (sessionResult.error) throw new Error(sessionResult.error);
            const newSessionUser = await getCurrentUserFromSession();
            if (newSessionUser) {
                setUser(newSessionUser);
                router.push('/dashboard');
            } else {
                throw new Error("Failed to establish session for user.");
            }
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
  
  // If we are on a public route, just render children.
  // If not, only render children if a user object exists.
  if (isPublicRoute || user) {
     return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, hasPermission, signInAsUser }}>
        {children}
        </AuthContext.Provider>
    );
  }
  
  // This will be shown briefly while redirecting.
  return <Preloader />;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
