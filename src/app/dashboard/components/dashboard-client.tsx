
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
import { ArrowLeft, CircleUserRound, Settings, LayoutDashboard, Ticket, Repeat, Play, Video, Rocket, User } from 'lucide-react';
import Link from 'next/link';
import Announcements from './announcements';
import AnalogClock from './analog-clock';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import type { HrData } from '@/lib/types';


interface DashboardClientProps {
  stats: DashboardStats;
  recentBookings: BookingEntry[];
  upcomingInstallments: SubscriptionInstallment[];
  chartData: { name: string; revenue: number; profit: number }[];
  users: HrData[];
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
        <div className="bg-gradient-to-r from-primary to-blue-500 rounded-2xl p-6 md:p-8 text-white shadow-glow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-20 left-20 w-40 h-40 rounded-full bg-white/20 animate-pulse-slow"></div>
                <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/10 animate-pulse-slow"></div>
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
                <div className="md:mr-8 text-right">
                    <h1 className="text-2xl md:text-4xl font-bold mb-2 animate__animated animate__fadeIn">مرحباً بعودتك، {user?.name || 'المستخدم'}!</h1>
                    <p className="opacity-90 mb-6 text-lg">هنا يمكنك إدارة أعمالك ومتابعة أداء شركتك بكل سهولة</p>
                    <div className="flex flex-wrap gap-4 justify-end">
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
  users,
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
                 <Card className="h-full shadow-sm">
                    <CardHeader>
                        <CardTitle>آخر الحجوزات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentBookings.map((booking, index) => (
                                <div key={booking.id || index} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors card-hover-effect">
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
                <Card className="h-full shadow-sm">
                    <CardHeader>
                        <CardTitle>الدفعات القادمة</CardTitle>
                    </CardHeader>
                     <CardContent>
                        <div className="space-y-4">
                            {upcomingInstallments.map((inst, index) => (
                                <div key={inst.id || index} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors card-hover-effect">
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
                            {upcomingInstallments.length === 0 && <p className="text-center text-muted-foreground p-4">لا توجد أقساط مستحقة قريبا.</p>}
                        </div>
                    </CardContent>
                </Card>
             </div>
        </motion.section>
        <section className="mt-8">
            <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">فريق العمل</h2>
                    <Link href="/users" className="text-primary-600 dark:text-primary-400 text-sm flex items-center">
                        عرض الكل <ArrowLeft className="ms-1 h-4 w-4" />
                    </Link>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {users.slice(0, 5).map(user => (
                        <div key={user.uid} className="flex flex-col items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors card-hover-effect">
                            <div className="relative mb-3">
                                <Avatar className="w-16 h-16 rounded-full border-2 border-primary-500">
                                  <AvatarImage src={user.avatarUrl} alt={user.name}/>
                                  <AvatarFallback><CircleUserRound className="h-8 w-8"/></AvatarFallback>
                                </Avatar>
                                <span className={`absolute bottom-0 right-0 w-3 h-3 ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-white dark:border-gray-700`}></span>
                            </div>
                            <h4 className="font-medium text-center">{user.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{user.position || 'موظف'}</p>
                        </div>
                    ))}
                    
                    <Link href="/users" className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors card-hover-effect border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                            <User className="text-gray-400 text-xl" />
                        </div>
                        <h4 className="font-medium text-center">إضافة عضو</h4>
                    </Link>
                </div>
            </div>
        </section>
    </motion.div>
  );
}
