
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Terminal, History, Trash2, Undo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { restoreVoucher, permanentDeleteVoucher, type DeletedVoucher } from '../actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getVoucherTypeLabel } from '@/lib/accounting/voucher-types';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ProtectedPage from '@/components/auth/protected-page';


const DeletedVouchersTable = ({ initialData, onDataChanged }: { initialData: DeletedVoucher[], onDataChanged: () => void }) => {
    const { toast } = useToast();
    
    const handleRestore = async (voucherId: string) => {
        const result = await restoreVoucher(voucherId);
        if (result.success) {
            toast({ title: 'تم استعادة السند بنجاح.' });
            onDataChanged();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };

    const handlePermanentDelete = async (voucherId: string) => {
        const result = await permanentDeleteVoucher(voucherId);
        if (result.success) {
            toast({ title: 'تم حذف السند نهائيًا.' });
            onDataChanged();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };
    
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-bold text-center">رقم الفاتورة</TableHead>
                        <TableHead className="font-bold text-center">النوع</TableHead>
                        <TableHead className="font-bold text-center">المبلغ</TableHead>
                        <TableHead className="font-bold text-center">حُذف بواسطة</TableHead>
                        <TableHead className="font-bold text-center">تاريخ الحذف</TableHead>
                        <TableHead className="text-center font-bold">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialData.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                لا توجد سجلات محذوفة لعرضها.
                            </TableCell>
                        </TableRow>
                    ) : (
                        initialData.map(voucher => (
                            <TableRow key={voucher.id}>
                                <TableCell className="text-center font-mono">{voucher.invoiceNumber}</TableCell>
                                <TableCell className="text-center"><Badge variant="outline">{getVoucherTypeLabel(voucher.voucherType)}</Badge></TableCell>
                                <TableCell className="text-center font-mono">{(voucher.debitEntries?.[0]?.amount || voucher.creditEntries?.[0]?.amount || 0).toLocaleString()} {voucher.currency}</TableCell>
                                <TableCell className="text-center">{voucher.deletedBy}</TableCell>
                                <TableCell className="text-center">{voucher.deletedAt ? format(parseISO(voucher.deletedAt), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                                <TableCell className="text-center">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleRestore(voucher.id)}>
                                                <Undo className="me-2 h-4 w-4" /> استعادة
                                            </DropdownMenuItem>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 focus:text-red-500">
                                                        <Trash2 className="me-2 h-4 w-4"/> حذف نهائي
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            هذا الإجراء سيحذف السجل نهائيًا ولا يمكن التراجع عنه مطلقًا.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handlePermanentDelete(voucher.id)} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، احذف نهائيًا</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

export default DeletedVouchersTable;
