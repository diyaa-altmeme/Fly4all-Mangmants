

import React, { Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft, Loader2 } from 'lucide-react';
import { getSubscriptions } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DeletedSubscriptionsTable from './components/deleted-subscriptions-table';


async function DeletedSubscriptionsContent() {
    const [deletedSubscriptions, error] = await getSubscriptions(true).then(res => [res, null]).catch(e => [null, e.message || "فشل تحميل البيانات"]);
    
    if (error) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    return <DeletedSubscriptionsTable initialData={deletedSubscriptions || []} />;
}


export default async function DeletedSubscriptionsPage() {
 
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Button asChild variant="outline" size="icon">
                <Link href="/subscriptions">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">سجل محذوفات الاشتراكات</h1>
                <p className="text-muted-foreground">
                    عرض الاشتراكات التي تم حذفها مع إمكانية استعادتها أو حذفها نهائيًا.
                </p>
            </div>
        </div>
        <Card>
            <CardContent className="pt-6">
                 <Suspense fallback={<div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <DeletedSubscriptionsContent />
                 </Suspense>
            </CardContent>
        </Card>
    </div>
  );
}
