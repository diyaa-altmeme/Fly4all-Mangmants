

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuditLogs } from './actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal, Users, ShieldCheck } from 'lucide-react';
import AuditLogContent from './components/audit-log-content';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { hasPermission } from '@/lib/permissions';
import type { User } from '@/lib/types';


export default async function ActivityLogPage() {
    const user = await getCurrentUserFromSession();

    if (!user || !hasPermission(user as User, 'audit:read')) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>وصول مرفوض</AlertTitle>
                <AlertDescription>ليس لديك الصلاحية لعرض هذه الصفحة.</AlertDescription>
            </Alert>
        );
    }
    
    const [logs, error] = await getAuditLogs().then(res => [res, null]).catch(e => [null, e.message]);
    
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
        <Card>
            <CardHeader>
                <CardTitle>سجل النشاطات</CardTitle>
                <CardDescription>
                    عرض لجميع العمليات التي تم تسجيلها في النظام، مع تفاصيل المستخدم والوقت.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AuditLogContent initialLogs={logs || []} />
            </CardContent>
        </Card>
    );
}
