
"use client";

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Circle, Mail, AlertTriangle, Ticket, Wallet, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { getNotificationsForUser, markNotificationAsRead, markAllAsRead } from '@/app/notifications/actions';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import type { Notification, NotificationType, User as CurrentUser, Client } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const notificationIcons: Record<NotificationType, React.ElementType> = {
    booking: Ticket,
    payment: Wallet,
    voucher: Ticket,
    remittance: Wallet,
    system: Settings,
    user: User,
    error: AlertTriangle,
    warning: AlertTriangle,
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | Client | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getCurrentUserFromSession().then(setCurrentUser);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      const fetchedNotifications = await getNotificationsForUser(currentUser.uid, { limit: 10 });
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.isRead).length);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    await markAllAsRead(currentUser.uid);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{unreadCount}</Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
           {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={handleMarkAllAsRead}>
                    <CheckCheck className="me-1 h-3 w-3"/>
                    تحديد الكل كمقروء
                </Button>
            )}
             <span>الإشعارات</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
           <DropdownMenuItem disabled>لا توجد إشعارات جديدة</DropdownMenuItem>
        ) : (
            notifications.map(n => {
                        const Icon = notificationIcons[n.type] || Bell;
                        const isWarning = n.type === 'warning' || n.type === 'error';
                        return (
                            <DropdownMenuItem key={n.id} className="flex items-start gap-3 justify-end" onSelect={(e) => { e.preventDefault(); handleMarkAsRead(n.id); }}>
                                <div className="flex-1 space-y-1 text-right">
                                    <Link href={n.link || '#'} className={cn("font-semibold hover:underline", isWarning && "text-yellow-600")}>{n.title}</Link>
                                    <p className="text-xs text-muted-foreground">{n.body}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ar })}
                                    </p>
                                </div>
                                {n.isRead ? <Circle className="h-2 w-2 mt-1.5 text-muted-foreground/50"/> : <Circle className={cn("h-2 w-2 mt-1.5 fill-current", isWarning ? "text-yellow-500" : "text-primary")} />}
                            </DropdownMenuItem>
                        )
                    })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center">
             <Link href="/notifications">
                عرض كل الإشعارات
            </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
