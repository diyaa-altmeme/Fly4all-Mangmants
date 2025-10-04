

import React, { Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft, Loader2 } from 'lucide-react';
import { getBookings } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DeletedBookingsTable from './components/deleted-bookings-table';
import type { BookingEntry } from '@/lib/types';


async function DeletedBookingsContent() {
    const [{ bookings }, error] = await getBookings({ includeDeleted: true }).then(res => [res, null]).catch(e => [{ bookings: [], total: 0 }, e.message || "فشل تحميل البيانات"]);
    
    if (error) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    return <DeletedBookingsTable initialData={bookings.map(b => b.originalData as BookingEntry)} />;
}


export default async function DeletedBookingsPage() {
 
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Button asChild variant="outline" size="icon">
                <Link href="/bookings">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">سجل محذوفات الحجوزات</h1>
                <p className="text-muted-foreground">
                    عرض الحجوزات التي تم حذفها مع إمكانية استعادتها أو حذفها نهائيًا.
                </p>
            </div>
        </div>
        <Card>
            <CardContent className="pt-6">
                 <Suspense fallback={<div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <DeletedBookingsContent />
                 </Suspense>
            </CardContent>
        </Card>
    </div>
  );
}
