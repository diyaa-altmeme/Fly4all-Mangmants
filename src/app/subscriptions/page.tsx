
import React, { Suspense } from 'react';
import { Loader2, Terminal } from 'lucide-react';
import { getSubscriptions, getSubscriptionInstallmentsForAll } from './actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import SubscriptionsContent from './components/subscriptions-content';
import { Skeleton } from '@/components/ui/skeleton';
import { revalidatePath } from 'next/cache';

async function SubscriptionsDataContainer() {
    const [subscriptions, installments, error] = await Promise.all([
        getSubscriptions(),
        getSubscriptionInstallmentsForAll(),
    ]).then(res => [...res, null]).catch(e => [null, null, e.message || "فشل تحميل البيانات"]);

    if (error || !subscriptions || !installments) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل بيانات الاشتراكات."}</AlertDescription>
            </Alert>
        );
    }
    
    const onDataChange = async () => {
        'use server';
        revalidatePath('/subscriptions');
    };

    return (
        <SubscriptionsContent
            initialSubscriptions={subscriptions}
            initialInstallments={installments}
            onDataChange={onDataChange}
        />
    );
}


export default function SubscriptionsPage() {
    return (
        <div className="w-full h-full">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <SubscriptionsDataContainer />
            </Suspense>
        </div>
    );
}
