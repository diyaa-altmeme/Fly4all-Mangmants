
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Ticket, CreditCard, Repeat, ArrowRightLeft, Users, FileText, BarChart3, Settings, Calculator, Wand2 } from 'lucide-react';
import AddBookingDialog from '@/app/bookings/components/add-booking-dialog';
import AddVisaDialog from '@/app/visas/components/add-visa-dialog';
import AddSubscriptionDialog from '@/app/subscriptions/components/add-subscription-dialog';
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import Link from 'next/link';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Loader2 } from 'lucide-react';

const actionItems = [
    { id: 'add_booking', label: "إضافة حجز طيران", icon: Ticket, DialogComponent: AddBookingDialog },
    { id: 'add_visa', label: "إضافة طلب فيزا", icon: CreditCard, DialogComponent: AddVisaDialog },
    { id: 'add_subscription', label: "إضافة اشتراك", icon: Repeat, DialogComponent: AddSubscriptionDialog },
    { id: 'add_remittance', label: "إضافة حوالة", icon: ArrowRightLeft, href: "/accounts/remittances" },
    { id: 'add_client', label: "إضافة علاقة", icon: Users, DialogComponent: AddClientDialog },
    { id: 'vouchers_list', href: "/accounts/vouchers/list", label: "سجل السندات", icon: FileText },
    { id: 'debts_report', href: "/reports/debts", label: "تقرير الأرصدة", icon: BarChart3 },
    { id: 'reconciliation', href: "/reconciliation", label: "التدقيق الذكي", icon: Wand2 },
];

export default function QuickAccess() {
    const { loaded: navDataLoaded } = useVoucherNav();
    
    const onActionSuccess = () => {
        // In a real app, you might revalidate data here
    }

    return (
        <Card className="h-full transform-gpu transition-all duration-300 hover:shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center justify-end gap-2"><Calculator/> الوصول السريع</CardTitle>
                <CardDescription className="text-right">أهم الإجراءات والعمليات في النظام.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {actionItems.map(item => {
                        const content = (
                            <div className="w-full h-24 flex flex-col items-center justify-center gap-2 shadow-sm transition-all bg-background border rounded-lg hover:bg-primary/10 hover:border-primary">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <item.icon className="h-6 w-6 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-center">{item.label}</span>
                            </div>
                        );

                        if (!navDataLoaded && item.DialogComponent) {
                            return <div key={item.id} className="w-full h-24 flex items-center justify-center bg-muted rounded-lg"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        }

                        if (item.href) {
                            return <Link key={item.id} href={item.href} className="block h-full">{content}</Link>;
                        }
                        
                        const ItemComponent = item.DialogComponent;
                        if (ItemComponent) {
                           return (
                             <ItemComponent 
                                key={item.id}
                                onBookingAdded={onActionSuccess} 
                                onClientAdded={onActionSuccess}
                                onSubscriptionAdded={onActionSuccess}
                            >
                                <div className="w-full h-full text-right">{content}</div>
                            </ItemComponent>
                           )
                        }
                        return null;

                    })}
                </div>
            </CardContent>
        </Card>
    );
}
