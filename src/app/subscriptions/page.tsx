
"use client";

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Terminal } from 'lucide-react';
import { getSubscriptions, getSubscriptionInstallmentsForAll } from './actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import SubscriptionsContent from './components/subscriptions-content';
import { Skeleton } from '@/components/ui/skeleton';
import type { Subscription, SubscriptionInstallment } from '@/lib/types';
import { PageContainer, PageHeader, PageSection } from '@/components/layout/page-structure';

function SubscriptionsDataContainer() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [installments, setInstallments] = useState<SubscriptionInstallment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [refreshedSubscriptions, refreshedInstallments] = await Promise.all([
                getSubscriptions(),
                getSubscriptionInstallmentsForAll(),
            ]);
            setSubscriptions(refreshedSubscriptions);
            setInstallments(refreshedInstallments);
        } catch (e: any) {
            setError(e.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

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
            initialSubscriptions={subscriptions}
            initialInstallments={installments}
            onDataChange={fetchData}
        />
    );
}

export default function SubscriptionsPage() {
    return (
        <PageContainer>
            <PageHeader
                title="إدارة الاشتراكات"
                description="عرض وإدارة جميع الاشتراكات الدورية في مكان واحد."
            />
            <PageSection>
                <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
                    <SubscriptionsDataContainer />
                </Suspense>
            </PageSection>
        </PageContainer>
    );
}
