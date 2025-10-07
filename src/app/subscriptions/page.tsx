
import React, { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Terminal } from 'lucide-react';
import { getSubscriptions, getSubscriptionInstallmentsForAll } from './actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import SubscriptionsContent from './components/subscriptions-content';
import { Skeleton } from '@/components/ui/skeleton';


// This is now a Server Component again, which is better for initial data fetching.
async function SubscriptionsData() {
    const [subscriptions, installments, error] = await Promise.all([
        getSubscriptions(),
        getSubscriptionInstallmentsForAll(),
    ]).then(res => [...res, null]).catch(e => [null, null, e.message || "Failed to load data"]);

    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <SubscriptionsContent
            initialSubscriptions={subscriptions || []}
            initialInstallments={installments || []}
        />
    );
}

export default function SubscriptionsPage() {
    return (
        <div className="space-y-6">
            <div className="px-0 sm:px-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة الاشتراكات</h1>
                <p className="text-muted-foreground">عرض وإدارة جميع الاشتراكات الدورية في مكان واحد.</p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                        <SubscriptionsData />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
