

"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BookingEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Undo } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { restoreBooking, permanentDeleteBooking } from '../../actions';
import { format, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

interface DeletedBookingsTableProps {
    initialData: BookingEntry[];
}

export default function DeletedBookingsTable({ initialData }: DeletedBookingsTableProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [data, setData] = React.useState(initialData);

    const handleRestore = async (bookingId: string) => {
        const result = await restoreBooking(bookingId);
        if (result.success) {
            toast({ title: "تم استعادة الحجز بنجاح" });
            setData(prev => prev.filter(b => b.id !== bookingId));
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

     const handlePermanentDelete = async (bookingId: string) => {
        const result = await permanentDeleteBooking(bookingId);
        if (result.success) {
            toast({ title: "تم حذف الحجز نهائيًا" });
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
                        <TableHead className="font-bold text-center">PNR</TableHead>
                        <TableHead className="font-bold text-center">تاريخ الإصدار</TableHead>
                        <TableHead className="font-bold text-center">تاريخ الحذف</TableHead>
                        <TableHead className="text-center font-bold">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                لا توجد حجوزات محذوفة لعرضها.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map(booking => (
                            <TableRow key={booking.id}>
                                <TableCell className="text-center font-mono">{booking.pnr}</TableCell>
                                <TableCell className="text-center">{booking.issueDate}</TableCell>
                                <TableCell className="text-center">{booking.deletedAt ? format(parseISO(booking.deletedAt), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
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
                                                            هذا الإجراء سيحذف الحجز نهائيًا ولا يمكن التراجع عنه مطلقًا.
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
