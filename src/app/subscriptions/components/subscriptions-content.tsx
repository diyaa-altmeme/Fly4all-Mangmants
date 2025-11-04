
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Subscription, SubscriptionInstallment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { History, Trash2, PlusCircle, Loader2, Settings } from 'lucide-react';
import SubscriptionsListView from './subscriptions-list-view';
import Link from 'next/link';
import AddSubscriptionDialog from '@/app/subscriptions/components/add-subscription-dialog';
import { produce } from 'immer';
import { useToast } from '@/hooks/use-toast';
import SubscriptionsSettingsDialog from './subscriptions-settings-dialog';
import { revalidateSubscriptionsPath } from '../actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SubscriptionsContentProps {
    initialSubscriptions: Subscription[];
    initialInstallments: SubscriptionInstallment[];
    onDataChange: () => void;
}

export default function SubscriptionsContent({ initialSubscriptions, initialInstallments, onDataChange }: SubscriptionsContentProps) {

    return (
        <Card>
             <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">إدارة الاشتراكات</h1>
                        <p className="text-muted-foreground">عرض وإدارة جميع الاشتراكات الدورية في مكان واحد.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <SubscriptionsSettingsDialog onSettingsChanged={onDataChange}>
                            <Button variant="outline"><Settings className="me-2 h-4 w-4"/> الإعدادات</Button>
                        </SubscriptionsSettingsDialog>
                        <Button asChild variant="outline">
                            <Link href="/subscriptions/deleted-subscriptions"><History className="me-2 h-4 w-4"/> سجل المحذوفات</Link>
                        </Button>
                        <AddSubscriptionDialog onSubscriptionAdded={onDataChange}>
                            <Button><PlusCircle className="me-2 h-4 w-4"/> إضافة اشتراك</Button>
                        </AddSubscriptionDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <SubscriptionsListView 
                    subscriptions={initialSubscriptions} 
                    allInstallments={initialInstallments}
                    onDataChange={onDataChange} 
                />
            </CardContent>
        </Card>
    );
}
