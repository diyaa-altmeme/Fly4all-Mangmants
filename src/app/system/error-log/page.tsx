

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorLogs } from '../activity-log/actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal, Users, ShieldCheck, FileWarning } from 'lucide-react';
import ErrorLogContent from './components/error-log-content';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { hasPermission } from '@/lib/permissions';
import type { User } from '@/lib/types';


export default async function ErrorLogPage() {
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
    
    const [logs, error] = await getErrorLogs().then(res => [res, null]).catch(e => [null, e.message]);
    
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
                <CardTitle className="flex items-center gap-2"><FileWarning className="h-5 w-5 text-destructive" /> سجل الأخطاء</CardTitle>
                <CardDescription>
                    عرض لجميع الأخطاء والتحذيرات التي تم تسجيلها في النظام للمراجعة والتحليل.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ErrorLogContent initialLogs={logs || []} />
            </CardContent>
        </Card>
    );
}

// HMR Refresh Comment
