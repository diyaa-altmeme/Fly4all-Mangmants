

import React, { Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft, Loader2 } from 'lucide-react';
import { getVisaBookings } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DeletedVisasTable from '../components/deleted-visas-table';


async function DeletedVisasContent() {
    const [deletedBookings, error] = await getVisaBookings(true).then(res => [res, null]).catch(e => [null, e.message]);
    
    if (error || !deletedBookings) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل البيانات"}</AlertDescription>
            </Alert>
        )
    }

    return <DeletedVisasTable initialData={deletedBookings} />;
}


export default async function DeletedVisasPage() {
 
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Button asChild variant="outline" size="icon">
                <Link href="/visas">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">سجل محذوفات الفيزا</h1>
                <p className="text-muted-foreground">
                    عرض طلبات الفيزا التي تم حذفها مع إمكانية استعادتها.
                </p>
            </div>
        </div>
        <Card>
            <CardContent className="pt-6">
                 <Suspense fallback={<div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <DeletedVisasContent />
                 </Suspense>
            </CardContent>
        </Card>
    </div>
  );
}



