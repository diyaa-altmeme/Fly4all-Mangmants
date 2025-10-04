
"use client";

import React from 'react';
import type { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, KeyRound, ImageIcon, Bell, CircleUserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/app/auth/actions';
import { ThemeToggle } from '@/components/theme-toggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import ChangePasswordDialog from './change-password-dialog';
import ChangeAvatarDialog from './change-avatar-dialog';
import NotificationCenter from '@/components/layout/notification-center';
import Link from 'next/link';


interface ClientViewLayoutProps {
    client: Client;
    children: React.ReactNode;
}

export default function ClientViewLayout({ client, children }: ClientViewLayoutProps) {
    const router = useRouter();

    const handleLogout = async () => {
        await logoutUser();
        router.push('/auth/login');
    };

    const handleAvatarChanged = () => {
        router.refresh();
    }

    return (
        <div className="min-h-screen w-full bg-muted/40 flex flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shadow-sm">
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <NotificationCenter />
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel>الإعدادات</DropdownMenuLabel>
                            <DropdownMenuSeparator/>
                            <ChangePasswordDialog clientId={client.id}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}><KeyRound className="me-2 h-4 w-4" />تغيير كلمة المرور</DropdownMenuItem>
                            </ChangePasswordDialog>
                            <ChangeAvatarDialog client={client} onAvatarChanged={handleAvatarChanged}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}><ImageIcon className="me-2 h-4 w-4" />تغيير الصورة</DropdownMenuItem>
                            </ChangeAvatarDialog>
                            <DropdownMenuSeparator/>
                             <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                <LogOut className="me-2 h-4 w-4" />
                                تسجيل الخروج
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                </div>
                 <Link href={`/clients/${client.id}`} className="flex items-center gap-3">
                     <h1 className="text-xl font-bold">{client.name}</h1>
                    <Avatar>
                        <AvatarImage src={client.avatarUrl} alt={client.name} />
                        <AvatarFallback><CircleUserRound /></AvatarFallback>
                    </Avatar>
                </Link>
            </header>
            <main className="flex-1 p-2 sm:p-4 md:p-6">
                {children}
            </main>
        </div>
    );
}
