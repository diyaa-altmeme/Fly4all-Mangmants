
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, BarChart, Ticket, Repeat } from 'lucide-react';
import type { DashboardStats } from '../actions';

interface StatsCardsProps {
  stats: DashboardStats;
}

const StatCard = ({ title, value, icon: Icon, currency, percentage, isPositive }: { title: string; value: string; icon: React.ElementType, currency: string, percentage: string, isPositive: boolean }) => {
  return (
    <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 card-hover-effect glass-effect glass-effect-dark">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-500 dark:text-gray-400">{title}</p>
                <h3 className="text-2xl font-bold mt-1">{value} <span className="text-sm">{currency}</span></h3>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <Icon className={`text-xl ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
            </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-green-500">
            <i className={`fas ${isPositive ? 'fa-arrow-up' : 'fa-arrow-down'} ml-1`}></i>
            <span>{percentage} عن الشهر الماضي</span>
        </div>
    </div>
  );
};


export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard 
        title="إجمالي الإيرادات" 
        value={stats.revenue.toLocaleString()} 
        icon={BarChart}
        currency="ر.س"
        percentage="12%"
        isPositive={true}
      />
      <StatCard 
        title="صافي الربح" 
        value={stats.profit.toLocaleString()}
        icon={DollarSign}
        currency="ر.س"
        percentage="8%"
        isPositive={true}
      />
      <StatCard 
        title="الحجوزات الجديدة" 
        value={stats.bookingsCount.toLocaleString()} 
        icon={Ticket}
        currency="حجزًا"
        percentage="3%"
        isPositive={false}
      />
      <StatCard 
        title="الاشتراكات النشطة" 
        value={stats.activeSubscriptions.toLocaleString()}
        icon={Repeat}
        currency="اشتراكًا"
        percentage="20%"
        isPositive={true}
      />
    </div>
  );
}

    