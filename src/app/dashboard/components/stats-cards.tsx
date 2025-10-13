
"use client";

import React from 'react';
import { DollarSign, BarChart, Ticket, Repeat, ArrowUp, ArrowDown } from 'lucide-react';
import type { DashboardStats } from '../actions';

const StatCard = ({ title, value, icon: Icon, currency, percentage, isPositive }: { title: string; value: string; icon: React.ElementType, currency: string, percentage: string, isPositive: boolean }) => {
  return (
    <div className="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 card-hover-effect">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-bold mt-1">{value} <span className="text-sm">{currency}</span></h3>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <Icon className={`h-6 w-6 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
            </div>
        </div>
        <div className={`mt-4 flex items-center text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />}
            <span>{percentage} عن الشهر الماضي</span>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">الهدف الشهري</span>
                <span className="font-medium">75%</span>
            </div>
            <div className="mt-2 w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{width: "75%"}}></div>
            </div>
        </div>
    </div>
  );
};


export default function StatsCards({ stats }: { stats: DashboardStats }) {
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

    