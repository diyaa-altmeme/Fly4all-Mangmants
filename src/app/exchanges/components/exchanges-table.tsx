
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, AreaChart } from 'lucide-react';
import type { Exchange } from '@/lib/types';
import AddExchangeDialog from './add-exchange-dialog';
// import { deleteExchange } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ExchangesTableProps {
  initialExchanges: Exchange[];
}

export default function ExchangesTable({ initialExchanges }: ExchangesTableProps) {
  const [exchanges, setExchanges] = useState(initialExchanges);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    setExchanges(initialExchanges);
  }, [initialExchanges]);

  const handleDelete = async (id: string) => {
    // const result = await deleteExchange(id);
    // if (result.success) {
    //   toast({ title: 'تم حذف البورصة بنجاح' });
    //   router.refresh();
    // } else {
    //   toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
    // }
  };

  const formatCurrency = (amount: number, currency: 'USD' | 'IQD') => {
    return `${amount.toLocaleString()} ${currency}`;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold text-center">اسم البورصة</TableHead>
            <TableHead className="font-bold text-center">العملة الافتراضية</TableHead>
            <TableHead className="font-bold text-center">حد التنبيه (USD)</TableHead>
            <TableHead className="text-center font-bold">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exchanges.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">لا توجد بورصات لعرضها.</TableCell>
            </TableRow>
          ) : exchanges.map((exchange) => (
            <TableRow key={exchange.id}>
              <TableCell className="font-medium text-center">{exchange.name}</TableCell>
              <TableCell className="font-mono text-center">{exchange.currencyDefault}</TableCell>
              <TableCell className="font-mono text-center">{exchange.thresholdAlertUSD.toLocaleString()} USD</TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                     <DropdownMenuItem asChild>
                        <Link href={`/exchanges/report?exchangeId=${exchange.id}`}>
                            <AreaChart className="me-2 h-4 w-4" /> عرض التقرير
                        </Link>
                    </DropdownMenuItem>
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
                                <AlertDialogAction onClick={() => handleDelete(exchange.id)} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، احذف</AlertDialogAction>
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
