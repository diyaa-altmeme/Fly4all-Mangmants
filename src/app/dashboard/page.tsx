
import React from 'react';
import { getDashboardStats, getRecentBookings, getUpcomingInstallments, getRevenueChartData } from './actions';
import DashboardClient from './components/dashboard-client';

export default async function DashboardPage() {
  const [stats, recentBookings, upcomingInstallments, chartData] = await Promise.all([
    getDashboardStats(),
    getRecentBookings(),
    getUpcomingInstallments(),
    getRevenueChartData(),
  ]);

  return (
    <DashboardClient 
      stats={stats}
      recentBookings={recentBookings}
      upcomingInstallments={upcomingInstallments}
      chartData={chartData}
    />
  );
}
