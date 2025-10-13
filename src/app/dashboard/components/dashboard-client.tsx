
"use client";

import React from 'react';
import type { DashboardStats, BookingEntry, SubscriptionInstallment } from '../actions';
import { motion } from 'framer-motion';
import StatsCards from './stats-cards';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import OverviewChart from './overview-chart';
import QuickAccess from './quick-access';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, CircleUserRound, Settings, LayoutDashboard, Ticket, Repeat, Play, Video } from 'lucide-react';
import Link from 'next/link';
import Announcements from './announcements';
import AnalogClock from './analog-clock';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DashboardClientProps {
  stats: DashboardStats;
  recentBookings: BookingEntry[];
  upcomingInstallments: SubscriptionInstallment[];
  chartData: { name: string; revenue: number; profit: number }[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const WelcomeCard = () => {
    const { user } = useAuth();
    return (
        <div className="bg-gradient-to-r from-primary-500 to-blue-500 rounded-2xl p-6 md:p-8 text-white shadow-glow-lg relative overflow-hidden gradient-border">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-20 left-20 w-40 h-40 rounded-full bg-white/20 animate-pulse-slow"></div>
                <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/10 animate-pulse-slow"></div>
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
                <div className="md:mr-8">
                    <h1 className="text-2xl md:text-4xl font-bold mb-2 animate__animated animate__fadeIn">مرحباً بعودتك، {user?.name || 'المستخدم'}!</h1>
                    <p className="opacity-90 mb-6 text-lg">هنا يمكنك إدارة أعمالك ومتابعة أداء شركتك بكل سهولة</p>
                    <div className="flex flex-wrap gap-4">
                        <button className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg flex items-center tilt-effect">
                            بدء الجولة <Play className="mr-2 h-4 w-4 wave-element" />
                        </button>
                        <button className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg flex items-center border border-white/20 tilt-effect">
                            مشاهدة الفيديو التعريفي <Video className="mr-2 h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="mt-8 md:mt-0 floating-element">
                    <Image src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80" 
                         width={256}
                         height={256}
                         className="w-48 h-48 md:w-64 md:h-64 object-contain" alt="رسمة لوحة تحكم" />
                </div>
            </div>
        </div>
    )
}

export default function DashboardClient({
  stats,
  recentBookings,
  upcomingInstallments,
  chartData,
}: DashboardClientProps) {
  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
        <motion.section variants={itemVariants} className="slide-in-element">
            <WelcomeCard />
        </motion.section>
        
        <motion.section variants={itemVariants}>
            <StatsCards stats={stats} />
        </motion.section>
        
        <motion.section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2">
                <OverviewChart data={chartData} />
             </div>
             <div>
                <QuickAccess />
            </div>
        </motion.section>

        <motion.section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div>
                 <Card className="h-full bg-white/80 dark:bg-dark-800/80 backdrop-blur-md glass-effect glass-effect-dark">
                    <CardHeader>
                        <CardTitle>آخر الحجوزات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentBookings.map((booking, index) => (
                                <div key={booking.id || index} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors card-hover-effect">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                                        <Ticket className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium">{booking.passengers[0]?.name} {booking.passengers.length > 1 && `و ${booking.passengers.length - 1} آخرون`}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{booking.route}</p>
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{booking.pnr}</span>
                                        <p className="text-xs text-gray-500 mt-1">{booking.issueDate ? format(parseISO(booking.issueDate), 'yyyy-MM-dd') : '-'}</p>
                                    </div>
                                </div>
                            ))}
                             {recentBookings.length === 0 && <p className="text-center text-muted-foreground p-4">لا توجد حجوزات حديثة.</p>}
                        </div>
                    </CardContent>
                </Card>
             </div>
              <div>
                <Card className="h-full bg-white/80 dark:bg-dark-800/80 backdrop-blur-md glass-effect glass-effect-dark">
                    <CardHeader>
                        <CardTitle>الدفعات القادمة</CardTitle>
                    </CardHeader>
                     <CardContent>
                        <div className="space-y-4">
                            {upcomingInstallments.map((inst, index) => (
                                <div key={inst.id || index} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors card-hover-effect">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-3">
                                        <i className="fas fa-money-bill-wave text-orange-500"></i>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium">{inst.clientName}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{inst.serviceName}</p>
                                    </div>
                                     <div className="text-left">
                                        <span className="font-medium text-orange-600">{inst.amount.toLocaleString()} {inst.currency}</span>
                                        <p className="text-xs text-gray-500 mt-1">{format(parseISO(inst.dueDate), 'yyyy-MM-dd')}</p>
                                    </div>
                                </div>
                            ))}
                            {upcomingInstallments.length === 0 && <p className="text-center text-muted-foreground p-4">لا توجد أقساط مستحقة قريبًا.</p>}
                        </div>
                    </CardContent>
                </Card>
             </div>
        </motion.section>
    </motion.div>
  );
}
    