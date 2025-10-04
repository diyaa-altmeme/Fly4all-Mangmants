
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUserFromSession } from '../auth/actions';
import { getNotificationsForUser } from './actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import NotificationsContent from './components/notifications-content';

export default async function NotificationsPage() {
    const user = await getCurrentUserFromSession();
    if (!user) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>مستخدم غير مصرح به</AlertTitle>
                <AlertDescription>الرجاء تسجيل الدخول لعرض الإشعارات.</AlertDescription>
            </Alert>
        )
    }

    const [notifications, error] = await getNotificationsForUser(user.uid)
        .then(res => [res, null])
        .catch(e => [null, e.message]);
    
     if (error || !notifications) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل الإشعارات."}</AlertDescription>
            </Alert>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>مركز الإشعارات</CardTitle>
                <CardDescription>عرض جميع التنبيهات والرسائل الخاصة بك في مكان واحد.</CardDescription>
            </CardHeader>
            <CardContent>
                <NotificationsContent initialNotifications={notifications} userId={user.uid} />
            </CardContent>
        </Card>
    );
}

