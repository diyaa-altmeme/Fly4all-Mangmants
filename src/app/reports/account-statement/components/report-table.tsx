
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { ReportTransaction } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowUpRight, Pencil, Trash2, MoreVertical } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";


const formatCurrency = (amount: number | null | undefined, currency: string) => {
  const value = Number(amount) || 0;
  if (Math.abs(value) < 0.00001) return `0.00`;
  const options = currency === 'IQD'
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const formattedAmount = new Intl.NumberFormat('en-US', options).format(Math.abs(value));
  if (value < 0) {
      return `(${formattedAmount})`;
  }
  return formattedAmount;
};

const DetailedDescription = ({ description }: { description: ReportTransaction['description'] }) => {
    if (typeof description === 'string') {
        return <p>{description}</p>;
    }
    
    return (
        <div className="space-y-1 text-xs text-right p-2 bg-muted/40 rounded-md">
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

    const label = mapVoucherLabel(transaction.sourceType || transaction.voucherType || transaction.type);

    return (
        <>
            <TableRow className="text-sm text-center font-medium transition-colors odd:bg-background even:bg-muted/30 hover:bg-muted/50 data-[state=selected]:bg-muted">
                <TableCell className="px-2 py-3 font-mono text-xs">{transaction.date ? format(parseISO(transaction.date), 'yyyy-MM-dd') : '-'}</TableCell>
                <TableCell className="px-2 py-3">{transaction.invoiceNumber}</TableCell>
                <TableCell className="px-2 py-3 space-y-1">
                    <Badge variant="outline" className="mr-1">{label}</Badge>
                </TableCell>
                <TableCell className="px-2 py-3 text-right text-xs"><DetailedDescription description={transaction.description} /></TableCell>
                <TableCell className="px-2 py-3 text-right text-xs">{transaction.notes}</TableCell>
                <TableCell className="px-2 py-3 font-mono font-bold text-red-600 text-center">
                    {transaction.debit > 0 ? formatCurrency(transaction.debit, transaction.currency) : '-'}
                </TableCell>
                <TableCell className="px-2 py-3 font-mono font-bold text-green-600 text-center">
                    {transaction.credit > 0 ? formatCurrency(transaction.credit, transaction.currency) : '-'}
                </TableCell>
                <TableCell className={cn("px-2 py-3 font-mono font-bold text-center", (transaction.balancesByCurrency?.[transaction.currency] ?? transaction.balance ?? 0) < 0 ? 'text-red-600' : 'text-green-600')}>
                    {formatCurrency(transaction.balancesByCurrency?.[transaction.currency] ?? transaction.balance ?? 0, transaction.currency)}
                </TableCell>
                <TableCell className="px-2 py-3 text-center">
                    <Badge variant="outline" className="text-[11px] px-2 py-1">{transaction.currency}</Badge>
                </TableCell>
                <TableCell className="px-2 py-3 text-xs text-center">{transaction.officer}</TableCell>
                <TableCell className="px-2 py-3 text-center">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                             <DropdownMenuItem onSelect={handleEdit}>
                                <Pencil className="me-2 h-4 w-4" /> تعديل السند
                            </DropdownMenuItem>
                            {transaction.sourceRoute && (
                                <DropdownMenuItem asChild>
                                    <Link href={transaction.sourceRoute} target="_blank" rel="noopener noreferrer">
                                        <ArrowUpRight className="me-2 h-4 w-4" />
                                        عرض المستند الأصلي
                                    </Link>
                                </DropdownMenuItem>
                            )}
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                        <Trash2 className="me-2 h-4 w-4" /> حذف
                                    </DropdownMenuItem>
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
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
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

export default function ReportTable({ 
    transactions, 
    onRefresh,
    showOpeningBalance,
    openingBalances
}: { 
    transactions: ReportTransaction[], 
    onRefresh: () => void,
    showOpeningBalance: boolean,
    openingBalances: Record<string, number>
}) {
    const openingBalanceRows = Object.entries(openingBalances)
        .filter(([, balance]) => Math.abs(balance) > 0.01)
        .map(([currency, balance]) => ({
            id: `opening_${currency}`,
            date: '',
            invoiceNumber: '',
            description: 'الرصيد السابق',
            type: 'رصيد افتتاحي',
            debit: 0,
            credit: 0,
            balance: balance,
            currency: currency as Currency,
        }));
        
    const transactionsToRender = showOpeningBalance 
        ? [...openingBalanceRows, ...transactions]
        : transactions;

    return (
        <TooltipProvider>
            <div className="space-y-3">
                <Table className="w-full text-xs" dir="rtl">
                    <TableHeader>
                        <TableRow className="bg-muted/70">
                            <TableHead className="px-2 py-3 font-bold text-center w-28">التاريخ</TableHead>
                            <TableHead className="px-2 py-3 font-bold text-center">رقم الفاتورة</TableHead>
                            <TableHead className="px-2 py-3 font-bold text-center">النوع</TableHead>
                            <TableHead className="px-2 py-3 text-right font-bold w-[25%]">البيان</TableHead>
                            <TableHead className="px-2 py-3 text-right font-bold w-[15%]">ملاحظات</TableHead>
                            <TableHead className="px-2 py-3 text-center font-bold text-red-700 bg-red-100/50">مدين</TableHead>
                            <TableHead className="px-2 py-3 text-center font-bold text-green-700 bg-green-100/50">دائن</TableHead>
                            <TableHead className="px-2 py-3 text-center font-bold bg-blue-100/50">الرصيد</TableHead>
                            <TableHead className="px-2 py-3 font-bold text-center">العملة</TableHead>
                            <TableHead className="px-2 py-3 font-bold text-center">الموظف</TableHead>
                            <TableHead className="px-2 py-3 font-bold text-center">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionsToRender.length > 0 ? (
                        transactionsToRender.map((tx) => (
                          <TransactionRow
                            key={tx.id}
                            transaction={tx}
                            onRefresh={onRefresh}
                          />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={11} className="h-48 text-center text-gray-500">
                             لا توجد حركات متاحة للعرض حسب الفلاتر المحددة.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
}
