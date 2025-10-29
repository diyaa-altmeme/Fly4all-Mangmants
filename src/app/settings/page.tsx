
import React, { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import ProtectedPage from '@/components/auth/protected-page';
import SettingsPageContent from './components/settings-page-content';
import { getSettings } from './actions';
import type { AppSettings } from '@/lib/types';


async function SettingsData() {
    const settings = await getSettings();
    return <SettingsPageContent initialSettings={settings} />;
}

export default function SettingsPage() {

    return (
        <ProtectedPage requiredPermission="settings:read">
            <div className="space-y-6">
                <div className="px-0 sm:px-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإعدادات العامة</h1>
                    <p className="text-muted-foreground">
                        تحكم في جميع جوانب النظام من هذه الواجهة المركزية.
                    </p>
                </div>
                <Suspense fallback={
                    <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start p-4">
                        <Skeleton className="h-[600px] w-full" />
                        <Skeleton className="h-[600px] w-full" />
                    </div>
                }>
                    <SettingsData />
                </Suspense>
            </div>
        </ProtectedPage>
    );
}
