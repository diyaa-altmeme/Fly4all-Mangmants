
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Repeat, Layers3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ProtectedPage from '@/components/auth/protected-page';

const sections = [
    {
        title: 'سجل حجوزات الطيران',
        description: 'عرض واستعادة حجوزات الطيران التي تم حذفها.',
        icon: Ticket,
        href: '/bookings/deleted-bookings',
    },
    {
        title: 'سجل الاشتراكات',
        description: 'عرض واستعادة الاشتراكات الدورية التي تم حذفها.',
        icon: Repeat,
        href: '/subscriptions/deleted-subscriptions',
    },
    {
        title: 'سجل السكمنت',
        description: 'عرض واستعادة فترات السكمنت التي تم حذفها.',
        icon: Layers3,
        href: '/segments/deleted-segments',
    }
];

export default function DeletedLogPage() {
    return (
        <ProtectedPage permission="admin">
            <div className="space-y-6">
                <div className="px-0 sm:px-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">سجل المحذوفات الموحد</h1>
                    <p className="text-muted-foreground">
                        مكان مركزي لمراجعة واستعادة جميع العناصر التي تم حذفها من النظام.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sections.map(section => (
                        <Card key={section.href}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <section.icon className="h-6 w-6 text-primary" />
                                    {section.title}
                                </CardTitle>
                                <CardDescription>{section.description}</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button asChild className="w-full">
                                    <Link href={section.href}>
                                        عرض السجل <ArrowLeft className="ms-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </ProtectedPage>
    );
}
