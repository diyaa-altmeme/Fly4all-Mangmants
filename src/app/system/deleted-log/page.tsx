
"use client";

import React, { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ProtectedPage from '@/components/auth/protected-page';
import DeletedLogContainer from './components/deleted-log-content';


export default function DeletedLogPage() {
    return (
        <ProtectedPage requiredPermission="admin">
            <Card>
                <CardHeader>
                    <CardTitle>سجل المحذوفات الموحد</CardTitle>
                    <CardDescription>
                        عرض جميع العمليات المالية التي تم حذفها من النظام مع إمكانية استعادتها أو حذفها نهائيًا.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                        <DeletedLogContainer />
                    </Suspense>
                </CardContent>
            </Card>
        </ProtectedPage>
    );
}
