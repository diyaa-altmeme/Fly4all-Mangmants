
import * as React from 'react';
import type { Remittance, RemittanceSettings } from '@/lib/types';
import { getRemittances } from './actions';
import { getSettings } from '@/app/settings/actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import RemittancesContent from './components/remittances-content';
import { revalidatePath } from 'next/cache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function RemittancesPage() {
    
    const [remittances, settings, error] = await Promise.all([
        getRemittances(),
        getSettings(),
    ]).then(res => [...res, null]).catch(e => [null, null, e.message || "فشل تحميل البيانات"]);

    const onDataChange = async () => {
        'use server';
        revalidatePath('/accounts/remittances');
    };
    
    if (error || !remittances || !settings) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل بيانات الحوالات أو البيانات المرتبطة بها."}</AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة الحوالات الواردة</h1>
                <p className="text-muted-foreground">
                    نظام متكامل لتسجيل وتدقيق واستلام الحوالات المالية الواردة من المكاتب الخارجية.
                </p>
            </div>
            <RemittancesContent
                initialRemittances={remittances}
                onDataChange={onDataChange}
            />
        </div>
    );
}
