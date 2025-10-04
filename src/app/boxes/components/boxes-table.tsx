
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, AreaChart } from 'lucide-react';
import type { Box } from '@/lib/types';
import AddEditBoxDialog from './add-edit-box-dialog';
import { deleteBox } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface BoxesTableProps {
  initialBoxes: Box[];
}

export default function BoxesTable({ initialBoxes }: BoxesTableProps) {
  const [boxes, setBoxes] = useState(initialBoxes);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    setBoxes(initialBoxes);
  }, [initialBoxes]);

  const handleDelete = async (id: string) => {
    const result = await deleteBox(id);
    if (result.success) {
      toast({ title: 'تم حذف الصندوق بنجاح' });
      router.refresh();
    } else {
      toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number, currency: 'USD' | 'IQD') => {
    return `${amount.toLocaleString()} ${currency}`;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold text-center">اسم الصندوق</TableHead>
            <TableHead className="font-bold text-center">الرصيد الافتتاحي (USD)</TableHead>
            <TableHead className="font-bold text-center">الرصيد الافتتاحي (IQD)</TableHead>
            <TableHead className="text-center font-bold">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boxes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">لا توجد صناديق لعرضها.</TableCell>
            </TableRow>
          ) : boxes.map((box) => (
            <TableRow key={box.id}>
              <TableCell className="font-medium text-center">{box.name}</TableCell>
              <TableCell className="font-mono text-center">{formatCurrency(box.openingBalanceUSD, 'USD')}</TableCell>
              <TableCell className="font-mono text-center">{formatCurrency(box.openingBalanceIQD, 'IQD')}</TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                     <DropdownMenuItem asChild>
                        <Link href={`/reports/account-statement?accountId=${box.id}`}>
                            <AreaChart className="me-2 h-4 w-4" /> عرض التقرير
                        </Link>
                    </DropdownMenuItem>
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
                                <AlertDialogAction onClick={() => handleDelete(box.id)} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، احذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
