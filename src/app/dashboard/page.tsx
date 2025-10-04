
import React, { Suspense } from 'react';
import { getDashboardStats, getRecentBookings, getUpcomingInstallments, getRevenueChartData } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import DashboardClient from './components/dashboard-client';
import { Skeleton } from '@/components/ui/skeleton';

async function DashboardDataContainer() {
    const [stats, recentBookings, upcomingInstallments, chartData, error] = await Promise.all([
        getDashboardStats(),
        getRecentBookings(),
        getUpcomingInstallments(),
        getRevenueChartData()
    ]).then(res => [...res, null]).catch(e => [null, null, null, null, e.message || "فشل تحميل البيانات"]);

    if (error || !stats || !recentBookings || !upcomingInstallments || !chartData) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <DashboardClient
            stats={stats}
            recentBookings={recentBookings}
            upcomingInstallments={upcomingInstallments}
            chartData={chartData}
        />
    )
}

const DashboardSkeleton = () => (
     <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
         <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Skeleton className="xl:col-span-2 h-96" />
            <Skeleton className="h-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
             <Skeleton className="h-80" />
             <Skeleton className="h-80" />
        </div>
    </div>
)

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardDataContainer />
        </Suspense>
    );
}

    