
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersContent from './users-content';
import RolesContent from './roles/roles-content';
import ClientPermissionsPage from '@/app/settings/client-permissions/page';
import type { User, Box, Role, HrData } from '@/lib/types';
import { Users, UserCog, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { hasPermission } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

interface UsersPageContentProps {
  initialUsers: HrData[];
  boxes: Box[];
  roles: Role[];
  onDataChange: () => void;
}

export default function UsersPageContent({ initialUsers, boxes, roles, onDataChange }: UsersPageContentProps) {
    const { user } = useAuth();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>إدارة المستخدمين والصلاحيات</CardTitle>
                <CardDescription>
                    إدارة حسابات الموظفين، تحديد أدوارهم، والتحكم في صلاحيات الوصول للنظام.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="employees">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="employees"><Users className="me-2 h-4 w-4"/>الموظفين</TabsTrigger>
                        <TabsTrigger value="roles"><UserCog className="me-2 h-4 w-4"/>أدوار الموظفين</TabsTrigger>
                        <TabsTrigger value="client-permissions" disabled><ShieldCheck className="me-2 h-4 w-4"/>صلاحيات العملاء</TabsTrigger>
                    </TabsList>
                    <TabsContent value="employees" className="mt-4">
                        <UsersContent
                            initialUsers={initialUsers}
                            boxes={boxes}
                            roles={roles}
                            onDataChange={onDataChange}
                        />
                    </TabsContent>
                    <TabsContent value="roles" className="mt-4">
                        {hasPermission(user as User, 'users:permissions') ? (
                           <RolesContent 
                                initialRoles={roles}
                                onDataChange={onDataChange}
                            />
                        ) : (
                            <Alert variant="destructive">
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>وصول مرفوض</AlertTitle>
                                <AlertDescription>ليس لديك صلاحية لإدارة الأدوار والصلاحيات.</AlertDescription>
                            </Alert>
                        )}
                    </TabsContent>
                    <TabsContent value="client-permissions" className="mt-4">
                       <ClientPermissionsPage />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
