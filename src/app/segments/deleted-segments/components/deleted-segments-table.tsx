

"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SegmentEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Undo } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { restoreSegmentPeriod, deleteSegmentPeriod } from '../../actions';
import { format, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

interface DeletedPeriod {
    fromDate: string;
    toDate: string;
    entries: SegmentEntry[];
    deletedAt?: string;
}
interface DeletedSegmentsTableProps {
    initialData: DeletedPeriod[];
}

export default function DeletedSegmentsTable({ initialData }: DeletedSegmentsTableProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [data, setData] = React.useState(initialData);

    const handleRestore = async (period: DeletedPeriod) => {
        const result = await restoreSegmentPeriod(period.fromDate, period.toDate);
        if (result.success) {
            toast({ title: "تم استعادة الفترة بنجاح" });
            setData(prev => prev.filter(p => !(p.fromDate === period.fromDate && p.toDate === period.toDate)));
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

     const handlePermanentDelete = async (period: DeletedPeriod) => {
        const result = await deleteSegmentPeriod(period.fromDate, period.toDate, true);
        if (result.success) {
            toast({ title: "تم حذف الفترة نهائيًا" });
             setData(prev => prev.filter(p => !(p.fromDate === period.fromDate && p.toDate === period.toDate)));
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-bold text-center">تاريخ البدء</TableHead>
                        <TableHead className="font-bold text-center">تاريخ الانتهاء</TableHead>
                        <TableHead className="font-bold text-center">عدد السجلات</TableHead>
                        <TableHead className="font-bold text-center">تاريخ الحذف</TableHead>
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
                        data.map(period => (
                            <TableRow key={`${period.fromDate}_${period.toDate}`}>
                                <TableCell className="text-center font-mono">{period.fromDate}</TableCell>
                                <TableCell className="text-center font-mono">{period.toDate}</TableCell>
                                <TableCell className="text-center font-bold">{period.entries.length}</TableCell>
                                <TableCell className="text-center">{period.deletedAt ? format(parseISO(period.deletedAt), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleRestore(period)}>
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
                                                            هذا الإجراء سيحذف الفترة وجميع سجلاتها المالية نهائيًا. لا يمكن التراجع عن هذا الإجراء.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handlePermanentDelete(period)} variant="destructive">
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

