
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, getRoles } from './actions';
import { getBoxes } from '@/app/boxes/actions';
import type { User, Box, Role, HrData } from '@/lib/types';
import UsersPageContent from './components/users-page-content';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import ProtectedPage from '@/components/auth/protected-page';
import { DateRange } from 'react-day-picker';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';

function UsersPageContainer() {
    const [users, setUsers] = useState<HrData[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (dateRange?: DateRange) => {
        setLoading(true);
        try {
            const [usersData, boxesData, rolesData] = await Promise.all([
                getUsers({ includeHrData: true, all: true, from: dateRange?.from, to: dateRange?.to }),
                getBoxes(),
                getRoles(),
            ]);
            setUsers(usersData as HrData[]);
            setBoxes(boxesData);
            setRoles(rolesData);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <UsersPageContent 
            initialUsers={users}
            boxes={boxes}
            roles={roles}
            onDataChange={fetchData}
        />
    )
}


export default function UsersPage() {
  return (
    <ProtectedPage requiredPermission="users:read">
        <div className="space-y-6">
            <div className="px-0 sm:px-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة المستخدمين والصلاحيات</h1>
                <p className="text-muted-foreground">إدارة حسابات الموظفين، تحديد أدوارهم، والتحكم في صلاحيات الوصول للنظام.</p>
            </div>
            <UsersPageContainer />
        </div>
    </ProtectedPage>
  );
}
