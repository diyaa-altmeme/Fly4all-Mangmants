
"use client";

import React from 'react';
import type { Box } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { MoreVertical, Edit, Trash2, AreaChart, Vault } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import AddEditBoxDialog from './add-edit-box-dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { deleteBox } from '../actions';

const formatCurrency = (amount: number, currency: 'USD' | 'IQD') => {
  return `${amount.toLocaleString()} ${currency}`;
}

export default function BoxCard({ box }: { box: Box }) {
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = async () => {
        const result = await deleteBox(box.id);
        if (result.success) {
            toast({ title: 'تم حذف الصندوق بنجاح' });
            router.refresh();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };

    return (
        <Card className="flex flex-col h-full overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between p-4 bg-muted/50">
                <div className="flex items-center gap-3">
                    <Vault className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle className="text-lg">{box.name}</CardTitle>
                        <CardDescription>صندوق مالي</CardDescription>
                    </div>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                           <MoreVertical className="h-4 w-4" />
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <AddEditBoxDialog isEditing box={box}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="me-2 h-4 w-4" /> تعديل
                            </DropdownMenuItem>
                        </AddEditBoxDialog>
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
                                        هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف الصندوق بشكل دائم.
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
            <CardContent className="p-4 flex-grow grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-600 font-semibold">رصيد USD</p>
                    <p className="font-mono font-bold text-lg">{formatCurrency(box.openingBalanceUSD, 'USD')}</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-600 font-semibold">رصيد IQD</p>
                    <p className="font-mono font-bold text-lg">{formatCurrency(box.openingBalanceIQD, 'IQD')}</p>
                </div>
            </CardContent>
            <CardFooter className="p-2 border-t">
                 <Button asChild variant="secondary" className="w-full">
                    <Link href={`/reports/account-statement?accountId=${box.id}`}>
                        <AreaChart className="me-2 h-4 w-4" /> عرض كشف الحساب
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
