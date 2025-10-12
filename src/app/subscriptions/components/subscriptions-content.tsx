
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Subscription, SubscriptionInstallment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { History, Trash2, PlusCircle, Loader2, Settings } from 'lucide-react';
import SubscriptionsListView from './subscriptions-list-view';
import Link from 'next/link';
import AddSubscriptionDialog from '@/app/subscriptions/components/add-subscription-dialog';
import { produce } from 'immer';
import { getSubscriptions, getSubscriptionInstallmentsForAll } from '../actions';
import { useToast } from '@/hooks/use-toast';
import SubscriptionsSettingsDialog from './subscriptions-settings-dialog';

interface SubscriptionsContentProps {
    initialSubscriptions: Subscription[];
    initialInstallments: SubscriptionInstallment[];
    onDataChange: () => void;
}

export default function SubscriptionsContent({ initialSubscriptions, initialInstallments, onDataChange }: SubscriptionsContentProps) {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions);
    const [installments, setInstallments] = useState<SubscriptionInstallment[]>(initialInstallments);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setSubscriptions(initialSubscriptions);
    }, [initialSubscriptions]);

    useEffect(() => {
        setInstallments(initialInstallments);
    }, [initialInstallments]);

    const handleSuccess = () => {
        // Instead of full refresh, we could optimistically update,
        // but a targeted refetch is safer for now.
        onDataChange();
    };
  
    return (
        <>
            <div className="flex items-center justify-end gap-2 mb-4">
                <SubscriptionsSettingsDialog onSettingsChanged={handleSuccess}>
                    <Button variant="outline"><Settings className="me-2 h-4 w-4"/> الإعدادات</Button>
                </SubscriptionsSettingsDialog>
                <Button asChild variant="outline">
                    <Link href="/system/activity-log"><History className="me-2 h-4 w-4"/> سجل النشاطات</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/subscriptions/deleted-subscriptions"><Trash2 className="me-2 h-4 w-4"/> سجل المحذوفات</Link>
                </Button>
                <AddSubscriptionDialog onSubscriptionAdded={handleSuccess}>
                    <Button><PlusCircle className="me-2 h-4 w-4"/> إضافة اشتراك</Button>
                </AddSubscriptionDialog>
            </div>
            
            {loading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <SubscriptionsListView 
                    subscriptions={subscriptions} 
                    allInstallments={installments}
                    onDataChange={handleSuccess} 
                />
            )}
        </>
    );
}
