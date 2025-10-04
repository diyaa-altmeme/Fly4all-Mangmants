
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, getRoles } from './actions';
import { getBoxes } from '@/app/boxes/actions';
import type { User, Box, Role, HrData } from '@/lib/types';
import UsersPageContent from './components/users-page-content';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { hasPermission } from '@/lib/permissions';

function UsersPageContainer() {
    const [users, setUsers] = useState<HrData[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersData, boxesData, rolesData] = await Promise.all([
                getUsers({ includeHrData: true }),
                getBoxes(),
                getRoles(),
            ]);
            setUsers(usersData);
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
    const { user } = useAuth();
    
    if (user && !hasPermission(user as User, 'users:read')) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>وصول مرفوض!</AlertTitle>
                <AlertDescription>ليس لديك الصلاحية اللازمة للوصول لهذه الصفحة.</AlertDescription>
            </Alert>
        );
    }

    return <UsersPageContainer />;
}
