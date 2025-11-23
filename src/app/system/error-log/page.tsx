
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorLogs } from '../activity-log/actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal, Users, ShieldCheck, FileWarning } from 'lucide-react';
import AuditLogContent from '../activity-log/components/audit-log-content';
import { getCurrentUserFromSession } from '@/app/(auth)/actions';
import { hasPermission } from '@/lib/permissions';
import type { User } from '@/lib/types';


export default async function ErrorLogPage() {
    const user = await getCurrentUserFromSession();

    if (!user || !('permissions' in user) || !hasPermission(user as User, 'system:error_log:read')) {
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
                <div className="flex items-center gap-3">
                    <FileWarning className="h-6 w-6 text-destructive" />
                    <div>
                        <CardTitle>سجل الأخطاء</CardTitle>
                        <CardDescription>
                            عرض لأخطاء النظام التي تم تسجيلها للمساعدة في التشخيص والإصلاح.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <AuditLogContent initialLogs={logs || []} />
            </CardContent>
        </Card>
    );
}
