
'use client';

import React from 'react';
import { getSettings } from '@/app/settings/actions';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import FieldsSettings from './fields/fields-settings';
import AliasesSettings from './aliases/aliases-settings';
import CreditPolicySettings from './credit-policy/credit-policy-settings';
import ImportSettings from './import/import-settings';

function RelationsSettingsPageContent({ initialSettings, onSettingsChanged }: { initialSettings: AppSettings, onSettingsChanged: () => void }) {
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                 <FieldsSettings relationSections={initialSettings.relationSections} onSettingsChanged={onSettingsChanged} />
            </div>
            <div className="lg:col-span-1 space-y-6">
                 <AliasesSettings settings={initialSettings} onSettingsChanged={onSettingsChanged} />
            </div>
            <div className="lg:col-span-1 space-y-6">
                 <CreditPolicySettings settings={initialSettings} onSettingsChanged={onSettingsChanged} />
            </div>
             <div className="lg:col-span-2">
                 <ImportSettings settings={initialSettings} />
            </div>
        </div>
    );
}

export default function RelationsSettingsPage() {
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
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Skeleton className="h-[400px] w-full lg:col-span-2" />
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[300px] w-full" />
            </div>
        );
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

    return <RelationsSettingsPageContent initialSettings={settings} onSettingsChanged={fetchData} />;
}
