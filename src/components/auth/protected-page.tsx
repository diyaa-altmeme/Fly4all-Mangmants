
"use client";

import React, { useEffect, useState } from 'react';
import type { Permission } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import Preloader from '../layout/preloader';

interface ProtectedPageProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

/**
 * A client-side component to protect pages based on authentication and permissions.
 * It uses the useAuth hook to get user data and redirects if necessary.
 * 
 * @param {React.ReactNode} children The content to render if the user is authenticated and has permission.
 * @param {Permission} [requiredPermission] The specific permission required to access the page.
 */
export default function ProtectedPage({ children, requiredPermission }: ProtectedPageProps) {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      
      if (requiredPermission && !hasPermission(requiredPermission)) {
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, requiredPermission, hasPermission, router]);

  if (loading || !isAuthorized) {
    if (!loading && !isAuthorized && user) {
      // User is loaded but not authorized
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
              <Terminal className="h-4 w-4" />
              <AlertTitle>وصول مرفوض!</AlertTitle>
              <AlertDescription>
                ليس لديك الصلاحية المطلوبة للوصول إلى هذه الصفحة. يرجى التواصل مع مدير النظام.
              </AlertDescription>
          </Alert>
        </div>
      );
    }
    // Still loading or about to redirect
    return <Preloader />;
  }

  // Render the page content if checks pass
  return <>{children}</>;
}
