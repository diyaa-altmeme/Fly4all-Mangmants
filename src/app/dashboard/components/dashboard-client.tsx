
"use client";

import React from 'react';
import type { DashboardStats, BookingEntry, SubscriptionInstallment } from '../actions';
import { motion } from 'framer-motion';
import StatsCards from './stats-cards';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import OverviewChart from './overview-chart';
import QuickAccess from './quick-access';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, CircleUserRound, Settings, LayoutDashboard, Ticket, Repeat } from 'lucide-react';
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
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-tr from-primary/80 to-accent text-primary-foreground overflow-hidden h-full flex flex-col justify-between">
            <CardHeader>
                <div className="flex items-center gap-4">
                     <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, -10, 10, 0],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            repeatType: "mirror"
                        }}
                    >
                        <LayoutDashboard className="h-12 w-12 text-white/80" />
                    </motion.div>
                    <div>
                        <CardTitle className="text-2xl font-bold">مرحباً بعودتك، {user?.name || 'المستخدم'}!</CardTitle>
                        <CardDescription className="text-primary-foreground/80">
                            هنا تجد ملخصًا سريعًا لأداء شركتك ووصولاً مباشرًا لأهم العمليات.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center gap-2">
                    <Button asChild variant="secondary" size="sm">
                        <Link href="/profile">الملف الشخصي</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="hover:bg-white/20">
                        <Link href="/settings">الإعدادات</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
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
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <WelcomeCard />
            <AnalogClock />
        </motion.div>
        
        <motion.div variants={itemVariants}>
            <StatsCards stats={stats} />
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <motion.div variants={itemVariants} className="lg:col-span-2">
                <OverviewChart data={chartData} />
             </motion.div>
             <motion.div variants={itemVariants}>
                <Announcements />
            </motion.div>
        </div>
        
        <motion.div className="lg:col-span-3" variants={itemVariants}>
            <QuickAccess />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <motion.div variants={itemVariants}>
                 <Card className="h-full">
                    <CardHeader>
                        <CardTitle>آخر الحجوزات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentBookings.map(booking => (
                                <div key={booking.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-md"><Ticket className="h-5 w-5 text-blue-500" /></div>
                                        <div>
                                            <p className="font-semibold">{booking.passengers[0]?.name} {booking.passengers.length > 1 && `و ${booking.passengers.length - 1} آخرون`}</p>
                                            <p className="text-sm text-muted-foreground">{booking.route}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <Badge variant="outline">{booking.pnr}</Badge>
                                        <p className="text-xs text-muted-foreground">{booking.issueDate ? format(parseISO(booking.issueDate), 'yyyy-MM-dd') : '-'}</p>
                                    </div>
                                </div>
                            ))}
                             {recentBookings.length === 0 && <p className="text-center text-muted-foreground p-4">لا توجد حجوزات حديثة.</p>}
                        </div>
                    </CardContent>
                </Card>
             </motion.div>
              <motion.div variants={itemVariants}>
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>الأقساط القادمة</CardTitle>
                    </CardHeader>
                     <CardContent>
                        <div className="space-y-4">
                            {upcomingInstallments.map(inst => (
                                <div key={inst.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 rounded-md"><Repeat className="h-5 w-5 text-orange-500" /></div>
                                        <div>
                                            <p className="font-semibold">{inst.clientName}</p>
                                            <p className="text-sm text-muted-foreground">{inst.serviceName}</p>
                                        </div>
                                    </div>
                                     <div className="text-left">
                                        <p className="font-mono font-bold text-orange-600">{inst.amount.toLocaleString()} {inst.currency}</p>
                                        <p className="text-xs text-muted-foreground">{format(parseISO(inst.dueDate), 'yyyy-MM-dd')}</p>
                                    </div>
                                </div>
                            ))}
                            {upcomingInstallments.length === 0 && <p className="text-center text-muted-foreground p-4">لا توجد أقساط مستحقة قريبًا.</p>}
                        </div>
                    </CardContent>
                </Card>
             </motion.div>
        </div>
    </motion.div>
  );
}
