

"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { VisaBookingEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Undo } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { restoreVisaBooking, permanentDeleteVisaBooking } from '../actions';
import { format, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

interface DeletedVisasTableProps {
    initialData: VisaBookingEntry[];
}

export default function DeletedVisasTable({ initialData }: DeletedVisasTableProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [data, setData] = React.useState(initialData);

    const handleRestore = async (bookingId: string) => {
        const result = await restoreVisaBooking(bookingId);
        if (result.success) {
            toast({ title: "تم استعادة الطلب بنجاح" });
            setData(prev => prev.filter(b => b.id !== bookingId));
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

     const handlePermanentDelete = async (bookingId: string) => {
        const result = await permanentDeleteVisaBooking(bookingId);
        if (result.success) {
            toast({ title: "تم حذف الطلب نهائيًا" });
             setData(prev => prev.filter(b => b.id !== bookingId));
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-bold text-center">رقم الفاتورة</TableHead>
                        <TableHead className="font-bold text-center">تاريخ التقديم</TableHead>
                        <TableHead className="font-bold text-center">تاريخ الحذف</TableHead>
                        <TableHead className="font-bold text-center">ملاحظات</TableHead>
                        <TableHead className="text-center font-bold">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                لا توجد سجلات محذوفة لعرضها.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map(booking => (
                            <TableRow key={booking.id}>
                                <TableCell className="text-center">{booking.invoiceNumber}</TableCell>
                                <TableCell className="text-center">{booking.submissionDate}</TableCell>
                                <TableCell className="text-center">{booking.deletedAt ? format(parseISO(booking.deletedAt), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                                <TableCell className="text-center">{booking.notes}</TableCell>
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleRestore(booking.id)}>
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
                                                        <AlertDialogAction onClick={() => handlePermanentDelete(booking.id)} variant="destructive">
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
