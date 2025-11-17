

"use client";
import React, { useMemo } from "react";
import { format, parseISO } from "date-fns";
import type { ReportInfo, ReportTransaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import ReportSummary from "@/app/reports/account-statement/components/report-summary";
import EditVoucherHandler from "@/app/reports/account-statement/components/edit-voucher-handler";
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


const formatCurrency = (amount: number, currency: string) => {
    if (amount === 0) return '0.00';
    const formattedAmount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    if (amount < 0) {
        return `(${formattedAmount})`;
    }
    return formattedAmount;
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

    return (
        <tr className={cn(
            "text-center font-bold",
            transaction.credit > 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20",
        )}>
            <td className="p-2 whitespace-nowrap font-mono">{format(parseISO(transaction.date), "yyyy-MM-dd")}</td>
            <td className="p-2">{transaction.type}</td>
            <td className="p-2 text-xs font-normal text-right">{typeof transaction.description === 'string' ? transaction.description : transaction.description.title}</td>
            <td className="p-2 font-mono text-red-600">{transaction.debit > 0 ? formatCurrency(transaction.debit, transaction.currency || 'IQD') : "-"}</td>
            <td className="p-2 font-mono text-green-600">{transaction.credit > 0 ? formatCurrency(transaction.credit, transaction.currency || 'IQD') : "-"}</td>
            <td className="p-2 font-mono">{formatCurrency(transaction.balance, transaction.currency || 'IQD')}</td>
            <td className="p-2">{transaction.currency}</td>
            <td className="p-2">{transaction.officer || ''}</td>
            <td className="p-2">
                <div className="flex items-center justify-center gap-1">
                    <EditVoucherHandler voucherId={transaction.id} onVoucherUpdated={onActionComplete}>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600"><Pencil className="h-4 w-4" /></Button>
                    </EditVoucherHandler>
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

export default function UnifiedReportTable({
  report,
  shareR = 50,
  shareM = 50,
  onActionComplete = () => {}
}: {
  report: ReportInfo | null;
  shareR?: number;
  shareM?: number;
  onActionComplete?: () => void;
}) {

  if (!report) {
    return <div className="p-8 text-center text-muted-foreground">الرجاء اختيار حساب وتحديد فترة لعرض التقرير.</div>;
  }
  
  const { transactions } = report;

  const { totalCredit, totalDebit, net, rShare, mShare } = useMemo(() => {
    const totalCredit = transactions.reduce((s, r) => s + r.credit, 0);
    const totalDebit = transactions.reduce((s, r) => s + r.debit, 0);
    const net = totalCredit - totalDebit;
    const rShare = net * (shareR / 100);
    const mShare = net * (shareM / 100);
    return { totalCredit, totalDebit, net, rShare, mShare };
  }, [transactions, shareR, shareM]);

  return (
    <div className="space-y-4">
      <ReportSummary report={report} />
      <div className="overflow-auto rounded border max-h-[60vh]">
        <Table>
          <thead className="bg-muted sticky top-0">
            <tr className="text-right font-bold">
              <th className="p-2">التاريخ</th>
              <th className="p-2">النوع</th>
              <th className="p-2">البيان</th>
              <th className="p-2 text-center">مدين</th>
              <th className="p-2 text-center">دائن</th>
              <th className="p-2 text-center">الرصيد</th>
              <th className="p-2 text-center">العملة</th>
              <th className="p-2 text-center">الموظف</th>
              <th className="p-2 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td className="p-3 text-center" colSpan={10}>لا توجد بيانات ضمن النطاق المحدد.</td></tr>
            ) : transactions.map((r) => (
              <TransactionRow key={r.id} transaction={r} onActionComplete={onActionComplete} />
            ))}
          </tbody>
          <tfoot className="bg-muted/50 font-bold sticky bottom-0">
             <tr>
                <td className="p-2" colSpan={3}>إجمالي الحركات</td>
                <td className="p-2 font-mono text-red-600 text-center">{formatCurrency(report.totalDebitUSD, 'USD')}</td>
                <td className="p-2 font-mono text-green-600 text-center">{formatCurrency(report.totalCreditUSD, 'USD')}</td>
                <td className="p-2" colSpan={4}></td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </div>
  );
}

