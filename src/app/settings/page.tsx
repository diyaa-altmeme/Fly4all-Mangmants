
import React, { Suspense } from 'react';
import { getSettings } from './actions';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import SettingsPageContent from './components/settings-page-content';


async function SettingsDataContainer() {
    const [settings, error] = await getSettings().then(res => [res, null]).catch(e => [null, e.message || "Failed to load settings."]);

    if (error || !settings) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }
    
    // We pass the fetched settings to the client component.
    // The onSettingsChanged logic will now be handled inside by re-fetching or router.refresh
    return <SettingsPageContent initialSettings={settings} onSettingsChanged={() => {}} />;
}


export default function SettingsPage() {
    return (
        <div className="space-y-6">
             <div className="px-0 sm:px-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإعدادات العامة</h1>
                <p className="text-muted-foreground">
                    تحكم في جميع جوانب النظام من هذه الواجهة المركزية.
                </p>
            </div>
             <Suspense fallback={
                <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start p-4">
                    <Skeleton className="h-[600px] w-full rounded-lg" />
                    <Skeleton className="h-[600px] w-full rounded-lg" />
                </div>
             }>
                <SettingsDataContainer />
            </Suspense>
        </div>
    );
}

