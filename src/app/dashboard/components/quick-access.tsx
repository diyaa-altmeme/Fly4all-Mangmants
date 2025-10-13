
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import AddBookingDialog from '@/app/bookings/components/add-booking-dialog';
import AddVisaDialog from '@/app/visas/components/add-visa-dialog';
import AddSubscriptionDialog from '@/app/subscriptions/components/add-subscription-dialog';
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Loader2, Ticket, CreditCard, Repeat, ArrowRightLeft, UserPlus, FileText, BarChart3, Calculator } from 'lucide-react';
import Link from 'next/link';

const actionItems = [
    { id: 'add_booking', label: "حجز جديد", icon: Ticket, DialogComponent: AddBookingDialog },
    { id: 'add_visa', label: "فيزا جديدة", icon: CreditCard, DialogComponent: AddVisaDialog },
    { id: 'add_subscription', label: "اشتراك جديد", icon: Repeat, DialogComponent: AddSubscriptionDialog },
    { id: 'add_remittance', label: "حوالة جديدة", icon: ArrowRightLeft, href: "/accounts/remittances" },
    { id: 'add_client', label: "عميل جديد", icon: UserPlus, DialogComponent: AddClientDialog },
    { id: 'new_invoice', href: "/accounts/vouchers", label: "فاتورة جديدة", icon: FileText },
    { id: 'new_report', href: "/reports", label: "تقرير جديد", icon: BarChart3 },
];

export default function QuickAccess() {
    const { data: navData, loaded: isDataLoaded } = useVoucherNav();
    
    const onActionSuccess = () => {
        // In a real app, you might revalidate data here
    }

    return (
        <Card className="h-full bg-white/80 dark:bg-dark-800/80 backdrop-blur-md glass-effect glass-effect-dark">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>إجراءات سريعة</span>
                    <Calculator/>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {actionItems.map(item => {
                        const content = (
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors card-hover-effect tilt-effect">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 bg-primary-100 dark:bg-primary-900/30`}>
                                    <item.icon className="h-6 w-6 text-primary-500" />
                                </div>
                                <span className="text-sm font-medium text-center">{item.label}</span>
                            </div>
                        );

                        if (!isDataLoaded && item.DialogComponent) {
                            return <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        }
                        
                        if (item.href) {
                             return <Link key={item.id} href={item.href} className="block h-full">{content}</Link>;
                        }
                        
                        const DialogComponent = item.DialogComponent;
                        if (DialogComponent) {
                            return (
                                <DialogComponent
                                    key={item.id}
                                    onBookingAdded={onActionSuccess}
                                    onClientAdded={onActionSuccess}
                                    onSubscriptionAdded={onActionSuccess}
                                >
                                    <div className="w-full h-full text-right cursor-pointer">{content}</div>
                                </DialogComponent>
                            )
                        }

                        return <div key={item.id} className="cursor-pointer">{content}</div>;

                    })}
                </div>
            </CardContent>
        </Card>
    );
}

    