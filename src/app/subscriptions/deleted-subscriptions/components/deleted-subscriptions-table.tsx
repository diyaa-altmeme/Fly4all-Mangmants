

"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Subscription } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Undo } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { restoreSubscription, permanentDeleteSubscription } from '../../actions';
import { format, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

interface DeletedSubscriptionsTableProps {
    initialData: Subscription[];
}

export default function DeletedSubscriptionsTable({ initialData }: DeletedSubscriptionsTableProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [data, setData] = React.useState(initialData);

    const handleRestore = async (subscriptionId: string) => {
        const result = await restoreSubscription(subscriptionId);
        if (result.success) {
            toast({ title: "تم استعادة الاشتراك بنجاح" });
            setData(prev => prev.filter(s => s.id !== subscriptionId));
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

     const handlePermanentDelete = async (subscriptionId: string) => {
        const result = await permanentDeleteSubscription(subscriptionId);
        if (result.success) {
            toast({ title: "تم حذف الاشتراك نهائيًا" });
             setData(prev => prev.filter(s => s.id !== subscriptionId));
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-bold text-center">الاشتراك</TableHead>
                        <TableHead className="font-bold text-center">العميل</TableHead>
                        <TableHead className="font-bold text-center">تاريخ الحذف</TableHead>
                        <TableHead className="text-center font-bold">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                لا توجد اشتراكات محذوفة لعرضها.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map(sub => (
                            <TableRow key={sub.id}>
                                <TableCell className="text-center font-semibold">{sub.serviceName}</TableCell>
                                <TableCell className="text-center">{sub.clientName}</TableCell>
                                <TableCell className="text-center">{sub.deletedAt ? format(parseISO(sub.deletedAt), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleRestore(sub.id)}>
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
                                                            هذا الإجراء سيحذف الاشتراك وكل الأقساط والفواتير المرتبطة به نهائيًا. لا يمكن التراجع عن هذا الإجراء.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handlePermanentDelete(sub.id)} variant="destructive">
                                                            نعم، احذف نهائيًا
                                                        </AlertDialogAction>
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
    );
}

