
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ReportTransaction, StructuredDescription } from "@/lib/types";
import { format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteVoucher } from "@/app/accounts/vouchers/list/actions";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import EditVoucherHandler from "./edit-voucher-handler";
import { mapVoucherLabel } from "@/lib/accounting/labels";

const formatCurrency = (amount: number) => {
  if (Math.abs(amount) < 0.01) return `0.00`;
  const formattedAmount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
  if (amount < 0) {
      return `(${formattedAmount})`;
  }
  return formattedAmount;
};

const DetailedDescription = ({ description }: { description: StructuredDescription | string }) => {
    if (typeof description === 'string') {
        return <p>{description}</p>;
    }
    
    return (
        <div className="space-y-1 text-xs text-right p-2 bg-muted/50 rounded-md">
            <p className="font-bold">{description.title}</p>
            {description.totalReceived && <p className="text-muted-foreground">{description.totalReceived}</p>}
            {description.selfReceipt && <p className="text-green-600 font-semibold">{description.selfReceipt}</p>}
            {description.distributions && description.distributions.length > 0 && (
                <div className="pt-1 mt-1 border-t border-dashed">
                    {description.distributions.map((d, i) => (
                        <div key={i} className="flex justify-between items-center text-muted-foreground">
                            <span>{d.name}</span>
                            <span className="font-mono">{d.amount}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TransactionRow = ({ transaction, onActionComplete }: { transaction: ReportTransaction, onActionComplete: () => void }) => {
    const { toast } = useToast();

    const handleDelete = async () => {
        const result = await deleteVoucher(transaction.id);
        if (result.success) {
            toast({ title: 'تم حذف السند بنجاح' });
            onActionComplete();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };

    const label = mapVoucherLabel(transaction.sourceType || transaction.voucherType);

    return (
        <tr className="text-sm text-center font-medium">
            <td className="p-2 font-mono">{transaction.date ? format(parseISO(transaction.date), 'yyyy-MM-dd') : '-'}</td>
            <td className="p-2">{transaction.invoiceNumber}</td>
            <td className="p-2"><Badge variant="outline">{label}</Badge></td>
            <td className="p-2 text-right text-xs">
                <DetailedDescription description={transaction.description} />
            </td>
            <td className="p-2 text-xs text-right">
                {transaction.notes}
            </td>
            <td className="p-2 font-mono font-bold text-red-600 text-center">{transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}</td>
            <td className="p-2 font-mono font-bold text-green-600 text-center">{transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}</td>
            <td className="p-2 font-mono text-center">
                <Badge variant={transaction.currency === 'USD' ? 'default' : 'secondary'} className={cn(transaction.currency === 'USD' && 'bg-accent text-accent-foreground')}>{transaction.currency}</Badge>
            </td>
            <td className={cn("p-2 font-mono font-bold text-center", transaction.balance < 0 ? 'text-red-600' : 'text-green-600')}>{formatCurrency(transaction.balance)}</td>
            <td className="p-2 text-xs text-center">{transaction.officer}</td>
            <td className="p-2 text-center">
                <div className="flex items-center gap-1 justify-center">
                     <EditVoucherHandler 
                        voucherId={transaction.id}
                        sourceType={transaction.sourceType} 
                        sourceId={transaction.sourceId} 
                        onVoucherUpdated={onActionComplete}
                     />
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>سيتم حذف هذا السند بشكل دائم.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، احذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </td>
        </tr>
    );
};


export default function ReportTable({ transactions, onRefresh }: { transactions: ReportTransaction[], onRefresh: () => void }) {
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="p-2 font-bold text-center">التاريخ</TableHead>
                    <TableHead className="p-2 font-bold text-center">رقم الفاتورة</TableHead>
                    <TableHead className="p-2 font-bold text-center">النوع</TableHead>
                    <TableHead className="p-2 text-right font-bold w-[30%]">البيان</TableHead>
                    <TableHead className="p-2 text-right font-bold w-[15%]">ملاحظات</TableHead>
                    <TableHead className="p-2 text-center font-bold">مدين</TableHead>
                    <TableHead className="p-2 text-center font-bold">دائن</TableHead>
                    <TableHead className="p-2 text-center font-bold">العملة</TableHead>
                    <TableHead className="p-2 text-center font-bold">الرصيد</TableHead>
                    <TableHead className="p-2 font-bold text-center">الموظف</TableHead>
                    <TableHead className="p-2 font-bold text-center">الإجراءات</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(transactions) && transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    onActionComplete={onRefresh}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-6 text-gray-500">
                    لا توجد بيانات متاحة لعرضها
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
        </Table>
    );
}
