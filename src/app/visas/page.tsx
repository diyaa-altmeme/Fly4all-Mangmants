
"use client";

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { Terminal } from 'lucide-react';
import { getVisaBookings } from './actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { VisaBookingEntry } from '@/lib/types';
import VisasContent from './components/visas-content-wrapper';
import { PageContainer, PageHeader, PageSection } from '@/components/layout/page-structure';


function VisasDataContainer() {
    const [bookings, setBookings] = useState<VisaBookingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

     const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getVisaBookings();
            setBookings(data);
        } catch (e: any) {
            setError(e.message || "فشل تحميل البيانات الضرورية لهذه الصفحة.");
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
    <VisasContent initialData={bookings} />
  );
}


export default function VisasPage() {
    return (
        <PageContainer>
            <PageHeader
                title="إدارة طلبات الفيزا"
                description="نظام متكامل لتسجيل ومتابعة جميع طلبات الفيزا وحالاتها."
            />
            <PageSection className="min-h-[20rem]">
                <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
                    <VisasDataContainer />
                </Suspense>
            </PageSection>
        </PageContainer>
    );
}
