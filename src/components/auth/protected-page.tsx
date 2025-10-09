'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import type { PERMISSIONS } from '@/lib/permissions';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import Preloader from '../layout/preloader';

interface ProtectedPageProps {
  permission: keyof typeof PERMISSIONS;
  children: React.ReactNode;
}

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
    <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
    <h1 className="text-3xl font-bold mb-2">وصول مرفوض</h1>
    <p className="text-lg text-muted-foreground">ليس لديك الصلاحية اللازمة لعرض هذه الصفحة.</p>
    <p className="text-sm text-muted-foreground mt-2">يرجى التواصل مع مسؤول النظام إذا كنت تعتقد أن هذا خطأ.</p>
  </div>
);

const ProtectedPage: React.FC<ProtectedPageProps> = ({ permission, children }) => {
  const { hasPermission, loading, user } = useAuth();

  if (loading || !user) {
    // Show a preloader or skeleton while auth state is being determined.
    return <Preloader />;
  }

  if (!hasPermission(permission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};

export default ProtectedPage;
