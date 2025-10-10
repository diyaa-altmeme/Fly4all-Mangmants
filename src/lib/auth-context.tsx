

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

const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin', '/', '/auth/dev-login'];
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
                // Auto-login as admin in development environment if not on a public route
                console.log("Development mode: Attempting to auto-login as admin...");
                const result = await signInAsUserAction(ADMIN_UID_FOR_DEV);
                 if (result.success && result.customToken) {
                    const userCredential = await signInWithCustomToken(auth, result.customToken);
                    const idToken = await getIdToken(userCredential.user);
                    const loginResult = await loginUser(idToken);
                    if(loginResult.success) {
                        // Instead of trying to refetch, force a full page reload to ensure
                        // the new session cookie is picked up by the server on the next request.
                        window.location.href = '/dashboard';
                         // Keep the component in a loading state until the redirect happens
                        await new Promise(() => {});
                    } else {
                         throw new Error("Failed to create session for dev admin.");
                    }
                } else {
                    throw new Error("Failed to get custom token for dev admin.");
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
  }, [pathname, isPublicRoute, router]);


  const signIn = async (email: string, password: string): Promise<{ success: boolean, error?: string}> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await getIdToken(userCredential.user);
      
      const result = await loginUser(idToken);
       if (result?.error) {
          throw new Error(result.error);
      }
      
      // Instead of re-fetching, just force a full page reload to let the middleware and server session take over
      window.location.href = '/dashboard';
      
      // Keep the promise pending to avoid unmounting components before reload
      await new Promise(() => {});

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
    setLoading(true);
    const { success, customToken, error } = await signInAsUserAction(userId);
    if(success && customToken) {
        // Redirect to a dedicated page to handle the sign-in logic
        // This avoids issues with iframes and cookies in preview environments
        router.push(`/auth/dev-login?token=${customToken}`);
    } else {
        console.error("Failed to sign in as user:", error);
        setLoading(false);
    }
  }


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
