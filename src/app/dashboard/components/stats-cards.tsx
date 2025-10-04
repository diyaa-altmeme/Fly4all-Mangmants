
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, BarChart, Ticket, Repeat } from 'lucide-react';
import type { DashboardStats } from '../actions';

interface StatsCardsProps {
  stats: DashboardStats;
}

const StatCard = ({ title, value, icon: Icon, currency, colorClass }: { title: string; value: string; icon: React.ElementType, currency: string, colorClass: string }) => {
  return (
    <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${colorClass}`}>
      <div className="absolute -left-4 -top-4 size-24 rounded-full bg-white/20 opacity-50"></div>
      <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-white/10 opacity-50"></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-bold">{title}</CardTitle>
        <Icon className="h-5 w-5" />
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-extrabold">{value}</div>
        <p className="text-xs">{currency}</p>
      </CardContent>
    </Card>
  );
};


export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard 
        title="الإيرادات" 
        value={stats.revenue.toLocaleString()} 
        icon={BarChart}
        currency={stats.currency === 'USD' ? 'دولار أمريكي' : 'دينار عراقي'}
        colorClass="bg-gradient-to-tr from-primary to-blue-400 text-primary-foreground border-primary"
      />
      <StatCard 
        title="صافي الربح" 
        value={stats.profit.toLocaleString()}
        icon={DollarSign}
        currency={stats.currency === 'USD' ? 'دولار أمريكي' : 'دينار عراقي'}
        colorClass="bg-gradient-to-tr from-accent to-orange-400 text-accent-foreground border-accent"
      />
      <StatCard 
        title="الحجوزات الجديدة" 
        value={stats.bookingsCount.toLocaleString()} 
        icon={Ticket}
        currency="حجزًا هذا الشهر"
        colorClass="bg-gradient-to-tr from-green-500 to-green-400 text-white border-green-600"
      />
      <StatCard 
        title="الاشتراكات النشطة" 
        value={stats.activeSubscriptions.toLocaleString()}
        icon={Repeat}
        currency="اشتراكًا نشطًا"
        colorClass="bg-gradient-to-tr from-secondary to-gray-400 text-secondary-foreground border-secondary"
      />
    </div>
  );
}

    