
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { BookingEntry, SubscriptionInstallment } from '../actions';
import { format, parseISO, isPast } from 'date-fns';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Loader2, Ticket, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type ActivityItem = 
    | { type: 'booking', data: BookingEntry }
    | { type: 'installment', data: SubscriptionInstallment };

export default function RecentActivity({ bookings, installments }: { bookings: BookingEntry[], installments: SubscriptionInstallment[] }) {
    const { data: navData, loaded } = useVoucherNav();
    
    const combinedActivity: ActivityItem[] = [
        ...bookings.map(b => ({ type: 'booking' as const, data: b })),
        ...installments.map(i => ({ type: 'installment' as const, data: i }))
    ];

    combinedActivity.sort((a, b) => {
        const dateA = a.type === 'booking' ? (a.data.enteredAt || a.data.issueDate) : a.data.dueDate;
        const dateB = b.type === 'booking' ? (b.data.enteredAt || b.data.issueDate) : b.data.dueDate;
        return new Date(dateB!).getTime() - new Date(dateA!).getTime();
    });
    
    if (!loaded) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>النشاطات الأخيرة</CardTitle>
                </CardHeader>
                <CardContent className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                 <Button asChild variant="outline" size="sm">
                    <Link href="/system/activity-log">عرض الكل</Link>
                </Button>
                <div>
                    <CardTitle>النشاطات الأخيرة</CardTitle>
                    <CardDescription>آخر الحجوزات والأقساط المستحقة.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="space-y-4">
                        {combinedActivity.length > 0 ? combinedActivity.map((activity, index) => {
                           if (activity.type === 'booking') {
                               const booking = activity.data;
                               const client = navData?.clients.find(c => c.id === booking.clientId);
                               const profit = booking.passengers.reduce((sum, p) => sum + (p.salePrice - p.purchasePrice), 0);
                               return (
                                   <div key={`booking-${booking.id}`} className="flex items-center gap-4">
                                       <div className="text-left">
                                            <p className="font-mono font-bold text-green-600">{profit.toFixed(2)} {booking.currency}</p>
                                            <p className="text-xs text-muted-foreground">{booking.enteredAt ? format(parseISO(booking.enteredAt), 'dd/MM/yyyy') : '-'}</p>
                                       </div>
                                       <div className="flex-grow text-right">
                                           <p className="font-semibold">{client?.name || booking.clientId}</p>
                                           <p className="text-sm text-muted-foreground">حجز جديد: {booking.pnr}</p>
                                       </div>
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                            <Ticket className="h-5 w-5 text-blue-500" />
                                       </div>
                                   </div>
                               )
                           } else { // installment
                                const inst = activity.data;
                                const isOverdue = isPast(parseISO(inst.dueDate)) && inst.status === 'Unpaid';
                                return (
                                    <div key={`inst-${inst.id}`} className="flex items-center gap-4">
                                       <div className="text-left">
                                            <p className="font-mono font-bold text-red-600">{(inst.amount - (inst.paidAmount || 0)).toFixed(2)} {inst.currency}</p>
                                            <p className={cn("text-xs font-bold", isOverdue ? 'text-red-500' : 'text-muted-foreground')}>{format(parseISO(inst.dueDate), 'dd/MM/yyyy')}</p>
                                       </div>
                                       <div className="flex-grow text-right">
                                           <p className="font-semibold">{inst.clientName}</p>
                                           <p className="text-sm text-muted-foreground">{inst.serviceName}</p>
                                       </div>
                                        <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                                            <Repeat className="h-5 w-5 text-red-500" />
                                       </div>
                                   </div>
                               )
                           }
                        }) : (
                             <div className="text-center h-24 flex items-center justify-center">
                                <p className="text-muted-foreground">لا توجد نشاطات لعرضها.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

    