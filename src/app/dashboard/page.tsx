
import React, { Suspense } from 'react';
import { getDashboardStats, getRecentBookings, getUpcomingInstallments, getRevenueChartData } from './actions';
import DashboardClient from './components/dashboard-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { getUsers } from '@/app/users/actions';
import type { User, HrData } from '@/lib/types';


async function DashboardDataContainer() {
  const [stats, recentBookings, upcomingInstallments, chartData, users] = await Promise.all([
    getDashboardStats(),
    getRecentBookings(),
    getUpcomingInstallments(),
    getRevenueChartData(),
    getUsers(),
  ]);

  return (
    <DashboardClient 
      stats={stats}
      recentBookings={recentBookings}
      upcomingInstallments={upcomingInstallments}
      chartData={chartData}
      users={users as HrData[]}
    />
  );
}

export default async function DashboardPage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-dark-900 dark:to-gray-800 text-gray-800 dark:text-gray-200 transition-colors duration-300 min-h-screen">
      <Suspense fallback={
        <div className="space-y-8 p-4 md:p-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      }>
        <div className="p-4 md:p-6">
          <DashboardDataContainer />
        </div>
      </Suspense>
    </div>
  );
}
