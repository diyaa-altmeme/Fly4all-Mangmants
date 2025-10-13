
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
import type { Notification, NotificationType, User as CurrentUser, Client } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const fetchedNotifications = await getNotificationsForUser(user.uid, { limit: 10 });
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.isRead).length);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllAsRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };
  
  return (
    <div className="relative">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative group">
                    <Bell className="text-xl" />
                    {unreadCount > 0 && <span className="notification-badge ping-element">{unreadCount}</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                 <DropdownMenuLabel className="flex justify-between items-center">
                    <span>الإشعارات ({unreadCount})</span>
                     {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={handleMarkAllAsRead}>
                            <CheckCheck className="me-1 h-3 w-3"/>
                            تحديد الكل كمقروء
                        </Button>
                    )}
                 </DropdownMenuLabel>
                 <DropdownMenuSeparator/>
                 <div className="max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <DropdownMenuItem disabled>لا توجد إشعارات جديدة</DropdownMenuItem>
                    ) : (
                        notifications.map(n => {
                            const Icon = notificationIcons[n.type] || Bell;
                            return(
                                <DropdownMenuItem key={n.id} className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-start">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${n.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                            <Icon className={`h-4 w-4 ${n.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} />
                                        </div>
                                        <div>
                                            <p className="font-medium">{n.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{n.body}</p>
                                             <p className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ar })}
                                            </p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            )
                        })
                    )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
                    <Link href="/notifications" className="text-primary-600 dark:text-primary-400 text-sm">
                        عرض جميع الإشعارات
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}

    