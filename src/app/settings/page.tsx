
'use client';

import React from 'react';
import { getSettings } from './actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import SettingsPageContent from './components/settings-page-content';
import { useAuth } from '@/context/auth-context';
import { hasPermission } from '@/lib/permissions';
import type { User, AppSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function SettingsPageContainer() {
    const [settings, setSettings] = React.useState<AppSettings | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSettings();
            setSettings(data);
        } catch (e: any) {
            setError(e.message || "Failed to load settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading || !settings) {
        return <Skeleton className="h-[600px] w-full" />;
    }

     if (error) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل الإعدادات."}</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <SettingsPageContent 
            initialSettings={settings}
            onSettingsChanged={fetchData}
        />
    )
}

export default function SettingsPage() {
    const { user } = useAuth();
    
    if (user === undefined) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }
    
    if (!user || !hasPermission(user as User, 'settings:read')) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>وصول مرفوض!</AlertTitle>
                <AlertDescription>ليس لديك الصلاحية اللازمة للوصول لهذه الصفحة.</AlertDescription>
            </Alert>
        );
    }

    return (
        <SettingsPageContainer />
    );
}
