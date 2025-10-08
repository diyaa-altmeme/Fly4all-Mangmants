
"use client";

import React, { Suspense } from 'react';
import { getDashboardStats, getRecentBookings, getUpcomingInstallments, getRevenueChartData } from './actions';
import { Skeleton } from "@/components/ui/skeleton";
import DashboardClient from './components/dashboard-client';
import useRequireAuth from '@/hooks/useRequireAuth';
import Preloader from '@/components/layout/preloader';

function DashboardDataContainer() {
    const [data, setData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function loadData() {
            try {
                const [stats, recentBookings, upcomingInstallments, chartData] = await Promise.all([
                    getDashboardStats(),
                    getRecentBookings(),
                    getUpcomingInstallments(),
                    getRevenueChartData()
                ]);
                setData({ stats, recentBookings, upcomingInstallments, chartData });
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading || !data) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-96 w-full lg:col-span-2" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }
    
    return (
        <DashboardClient
            stats={data.stats}
            recentBookings={data.recentBookings}
            upcomingInstallments={data.upcomingInstallments}
            chartData={data.chartData}
        />
    )
}


export default function DashboardPage() {
    const { user, loading } = useRequireAuth();

    if (loading || !user) {
        return <Preloader />;
    }

    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <DashboardDataContainer />
        </Suspense>
    );
}
