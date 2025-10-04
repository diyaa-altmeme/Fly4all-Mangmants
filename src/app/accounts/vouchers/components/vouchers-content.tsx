
"use client";

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileDown, GitBranch, ChevronsRightLeft, FileUp, Banknote, BookUser, Settings } from "lucide-react";
import NewStandardReceiptDialog from './new-standard-receipt-dialog';
import NewPaymentVoucherDialog from './new-payment-voucher-dialog';
import NewExpenseVoucherDialog from './new-expense-voucher-dialog';
import NewJournalVoucherDialog from './new-journal-voucher-dialog';
import NewDistributedReceiptDialog from './new-distributed-receipt-dialog';
import type { Client, Supplier, Box, User, AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// This component is no longer the primary way to create vouchers.
// It can be removed or kept as a fallback on the /accounts/vouchers page.
// The main functionality has been moved to the main navigation bar.
export default function VouchersContent({ clients, suppliers, boxes, users, settings, onDataChanged }: any) {
    return (
        <div className="flex items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
            <div>
                <h3 className="text-xl font-bold">تم نقل مركز إنشاء السندات</h3>
                <p className="text-muted-foreground mt-2">
                    يمكنك الآن إنشاء جميع أنواع السندات مباشرة من قائمة "السندات" في شريط التنقل العلوي.
                </p>
            </div>
        </div>
    );
}
