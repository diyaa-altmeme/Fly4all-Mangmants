

import React, { Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft, Loader2 } from 'lucide-react';
import { getSegments } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DeletedSegmentsTable from './components/deleted-segments-table';
import type { SegmentEntry } from '@/lib/types';


async function DeletedSegmentsContent() {
    const deletedSegments = await getSegments(true).catch(e => {
        console.error(e);
        return null;
    });
    
    if (deletedSegments === null) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>فشل تحميل البيانات المحذوفة.</AlertDescription>
            </Alert>
        )
    }

    // Group deleted segments by period
    const groupedByPeriod = (deletedSegments || []).reduce((acc, entry) => {
        const periodKey = `${entry.fromDate}_${entry.toDate}`;
        if (!acc[periodKey]) {
            acc[periodKey] = {
                fromDate: entry.fromDate,
                toDate: entry.toDate,
                entries: [],
                deletedAt: entry.deletedAt,
            };
        }
        acc[periodKey].entries.push(entry);
        return acc;
    }, {} as Record<string, { fromDate: string; toDate: string; entries: SegmentEntry[], deletedAt?: string }>);


    return <DeletedSegmentsTable initialData={Object.values(groupedByPeriod)} />;
}


export default async function DeletedSegmentsPage() {
 
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Button asChild variant="outline" size="icon">
                <Link href="/segments">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">سجل محذوفات السكمنت</h1>
                <p className="text-muted-foreground">
                    عرض فترات السكمنت التي تم حذفها مع إمكانية استعادتها أو حذفها نهائيًا.
                </p>
            </div>
        </div>
        <Card>
            <CardContent className="pt-6">
                 <Suspense fallback={<div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <DeletedSegmentsContent />
                 </Suspense>
            </CardContent>
        </Card>
    </div>
  );
}

