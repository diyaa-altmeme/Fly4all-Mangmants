

"use client";

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Settings, Loader2 } from "lucide-react";
import Link from 'next/link';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';


export default function VouchersPage() {
    
    const { loaded } = useVoucherNav();

    if (!loaded) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-center p-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">مركز السندات</h1>
                    <p className="text-muted-foreground">
                        إدارة جميع أنواع السندات والمعاملات المالية في النظام.
                    </p>
                </div>
                <Button asChild variant="outline">
                <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    إعدادات السندات
                </Link>
                </Button>
            </div>
             <div className="flex items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                <div>
                    <h3 className="text-xl font-bold">تم نقل مركز إنشاء السندات</h3>
                    <p className="text-muted-foreground mt-2">
                        يمكنك الآن إنشاء جميع أنواع السندات مباشرة من قائمة "السندات" في شريط التنقل العلوي.
                    </p>
                </div>
            </div>
        </div>
    );
}
