
"use client";

import * as React from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ReportTransaction, StructuredDescription } from "@/lib/types";
import { format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
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

const formatCurrency = (amount: number, currency: 'USD' | 'IQD') => {
  if (Math.abs(amount) < 0.01) return `0.00`;
  const options = currency === 'IQD' 
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } 
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const formattedAmount = new Intl.NumberFormat('en-US', options).format(Math.abs(amount));
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

const TransactionRow = ({ transaction, onRefresh }: { transaction: ReportTransaction, onRefresh: () => void }) => {
    const { toast } = useToast();
    const [isEditOpen, setIsEditOpen] = React.useState(false);

    const handleDelete = async () => {
        // This needs to be adapted for the new voucher structure if ID is not the voucher ID
        const result = await deleteVoucher(transaction.id.split('_')[0]);
        if (result.success) {
            toast({ title: 'تم حذف السند بنجاح' });
            onRefresh();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };
    
    const handleEdit = () => {
        setIsEditOpen(true);
    };

    const label = mapVoucherLabel(transaction.sourceType || transaction.voucherType);
    const direction = transaction.direction
        || (transaction.debit && transaction.debit > 0 ? 'debit'
        : transaction.credit && transaction.credit > 0 ? 'credit'
        : 'neutral');

    return (
        <>
            <tr className="text-sm text-center font-medium hover:bg-muted/50">
                <td className="p-2 font-mono text-xs">{transaction.date ? format(parseISO(transaction.date), 'yyyy-MM-dd HH:mm') : '-'}</td>
                <td className="p-2">{transaction.invoiceNumber}</td>
                <td className="p-2 space-y-1">
                    <Badge variant="outline" className="mr-1">
                        {label}
                    </Badge>
                    <div>
                        <Badge
                            variant="secondary"
                            className={cn(
                                "text-[10px]",
                                direction === 'debit' && 'bg-green-600/10 text-green-700',
                                direction === 'credit' && 'bg-red-600/10 text-red-700'
                            )}
                        >
                            {direction === 'debit' ? 'مدين' : direction === 'credit' ? 'دائن' : 'عام'}
                        </Badge>
                    </div>
                </td>
                <td className="p-2 text-right text-xs">
                    <DetailedDescription description={transaction.description} />
                </td>
                <td className="p-2 text-xs text-right">
                    {transaction.notes}
                </td>
                <td className="p-2 font-mono font-bold text-red-600 text-center">{transaction.currency === 'USD' ? formatCurrency(transaction.debit, 'USD') : '-'}</td>
                <td className="p-2 font-mono font-bold text-green-600 text-center">{transaction.currency === 'USD' ? formatCurrency(transaction.credit, 'USD') : '-'}</td>
                <td className={cn("p-2 font-mono font-bold text-center", transaction.balanceUSD < 0 ? 'text-red-600' : 'text-green-600')}>{formatCurrency(transaction.balanceUSD, 'USD')}</td>
                <td className="p-2 font-mono font-bold text-red-600 text-center">{transaction.currency === 'IQD' ? formatCurrency(transaction.debit, 'IQD') : '-'}</td>
                <td className="p-2 font-mono font-bold text-green-600 text-center">{transaction.currency === 'IQD' ? formatCurrency(transaction.credit, 'IQD') : '-'}</td>
                <td className={cn("p-2 font-mono font-bold text-center", transaction.balanceIQD < 0 ? 'text-red-600' : 'text-green-600')}>{formatCurrency(transaction.balanceIQD, 'IQD')}</td>
                <td className="p-2 text-xs text-center">{transaction.officer}</td>
                <td className="p-2 text-center">
                    <div className="flex items-center gap-1 justify-center">
                        {transaction.sourceRoute && (
                            <Button
                                asChild
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-primary"
                                title="عرض المستند الأصلي"
                            >
                                <Link href={transaction.sourceRoute} target="_blank" rel="noopener noreferrer">
                                    <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600" onClick={handleEdit}>
                            <Pencil className="h-4 w-4" />
                        </Button>
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
            {isEditOpen && (
                <EditVoucherHandler
                    voucher={transaction}
                    isOpen={isEditOpen}
                    onClose={() => {
                        setIsEditOpen(false);
                        onRefresh();
                    }}
                />
            )}
        </>
    );
};

export default function ReportTable({ transactions, onRefresh }: { transactions: ReportTransaction[], onRefresh: () => void }) {
    
    return (
        <Table className="w-full text-xs">
            <TableHeader>
                <TableRow className="bg-muted/80">
                    <TableHead className="p-2 font-bold text-center w-32">التاريخ</TableHead>
                    <TableHead className="p-2 font-bold text-center">رقم الفاتورة</TableHead>
                    <TableHead className="p-2 font-bold text-center">النوع</TableHead>
                    <TableHead className="p-2 text-right font-bold w-[25%]">البيان</TableHead>
                    <TableHead className="p-2 text-right font-bold w-[15%]">ملاحظات</TableHead>
                    <TableHead className="p-2 text-center font-bold text-red-700 bg-red-100/50">مدين (USD)</TableHead>
                    <TableHead className="p-2 text-center font-bold text-green-700 bg-green-100/50">دائن (USD)</TableHead>
                    <TableHead className="p-2 text-center font-bold bg-blue-100/50">الرصيد (USD)</TableHead>
                    <TableHead className="p-2 text-center font-bold text-red-700 bg-red-100/50">مدين (IQD)</TableHead>
                    <TableHead className="p-2 text-center font-bold text-green-700 bg-green-100/50">دائن (IQD)</TableHead>
                    <TableHead className="p-2 text-center font-bold bg-blue-100/50">الرصيد (IQD)</TableHead>
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
                    onRefresh={onRefresh}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={13} className="h-48 text-center text-gray-500">
                    لا توجد بيانات متاحة لعرضها
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
        </Table>
    );
}
