
"use client";

import React, { useState, useEffect } from 'react';
import type { Notification, NotificationType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { CheckCheck, Trash2, Bell, Ticket, Wallet, User, Settings, Plane } from 'lucide-react';
import { markAllAsRead, getNotificationsForUser } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const notificationIcons: Record<NotificationType, React.ElementType> = {
    booking: Plane,
    payment: Wallet,
    voucher: Ticket,
    remittance: Wallet,
    system: Settings,
    user: User
};

interface NotificationsContentProps {
    initialNotifications: Notification[];
    userId: string;
}

export default function NotificationsContent({ initialNotifications, userId }: NotificationsContentProps) {
    const [notifications, setNotifications] = useState(initialNotifications);
    const { toast } = useToast();

    const handleMarkAllRead = async () => {
        const result = await markAllAsRead(userId);
        if (result.success) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            toast({ title: "تم تحديد جميع الإشعارات كمقروءة" });
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" onClick={handleMarkAllRead} disabled={notifications.every(n => n.isRead)}>
                    <CheckCheck className="me-2 h-4 w-4" />
                    تحديد الكل كمقروء
                </Button>
            </div>
            <div className="space-y-3">
                {notifications.length === 0 ? (
                     <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">لا توجد إشعارات لعرضها.</p>
                    </div>
                ) : (
                    notifications.map(n => {
                        const Icon = notificationIcons[n.type] || Bell;
                        return (
                            <div key={n.id} className={cn("flex items-start gap-4 p-4 border rounded-lg", !n.isRead && "bg-primary/5")}>
                                <div className={cn("p-2 rounded-full", !n.isRead ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-grow">
                                     <Link href={n.link || '#'} className="font-bold hover:underline">{n.title}</Link>
                                     <p className="text-sm text-muted-foreground">{n.body}</p>
                                     <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ar })}
                                    </p>
                                </div>
                                {!n.isRead && <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
