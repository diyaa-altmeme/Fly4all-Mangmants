
"use client";

import React from 'react';
import type { Exchange } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Trash2, AreaChart, GitCompareArrows } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import AddExchangeDialog from './add-exchange-dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
// import { deleteExchange } from '../actions';

const formatCurrency = (amount: number, currency: 'USD' | 'IQD') => {
  return `${amount.toLocaleString()} ${currency}`;
}

export default function ExchangeCard({ exchange }: { exchange: Exchange }) {
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = async () => {
        // const result = await deleteExchange(exchange.id);
        // if (result.success) {
        //     toast({ title: 'تم حذف البورصة بنجاح' });
        //     router.refresh();
        // } else {
        //     toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        // }
    };

    return (
        <Card className="flex flex-col h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between p-4 bg-muted/50">
                <div className="flex items-center gap-3">
                    <GitCompareArrows className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle className="text-lg">{exchange.name}</CardTitle>
                        <CardDescription>بورصة</CardDescription>
                    </div>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                           <MoreVertical className="h-4 w-4" />
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <AddExchangeDialog isEditing exchange={exchange} onSuccess={() => router.refresh()}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="me-2 h-4 w-4" /> تعديل
                            </DropdownMenuItem>
                        </AddExchangeDialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 focus:text-red-600">
                                    <Trash2 className="me-2 h-4 w-4"/>حذف
                                 </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف البورصة بشكل دائم.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، احذف</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                 </DropdownMenu>
            </CardHeader>
            <CardContent className="p-4 flex-grow grid grid-cols-1 gap-4">
                 <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-600 font-semibold">حد التنبيه</p>
                    <p className="font-mono font-bold text-lg">{formatCurrency(exchange.thresholdAlertUSD, 'USD')}</p>
                </div>
            </CardContent>
            <CardFooter className="p-2 border-t">
                 <Button asChild variant="secondary" className="w-full">
                    <Link href={`/exchanges/report?exchangeId=${exchange.id}`}>
                        <AreaChart className="me-2 h-4 w-4" /> عرض كشف الحساب
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
