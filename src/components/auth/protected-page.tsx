'use client';

import { useAuth } from '@/lib/auth-context';
import type { Permission } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProtectedPageProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export default function ProtectedPage({ children, requiredPermission }: ProtectedPageProps) {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
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

  return <>{children}</>;
}
