
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ReportTransaction, StructuredDescription } from "@/lib/types";
import { format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button";
import { ChevronDown, Info, MoreHorizontal } from "lucide-react";


const formatCurrency = (amount: number, currency: string) => {
  if (Math.abs(amount) < 0.01) return `0.00`;
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
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


const TransactionRow = ({ transaction }: { transaction: ReportTransaction }) => {
    return (
        <tr className="text-sm text-center font-medium">
            <td className="p-2 font-mono">{transaction.date ? format(parseISO(transaction.date), 'yyyy-MM-dd') : '-'}</td>
            <td className="p-2">{transaction.invoiceNumber}</td>
            <td className="p-2"><Badge variant="outline">{transaction.type}</Badge></td>
            <td className="p-2 text-right text-xs">
                {typeof transaction.description === 'string' ? transaction.description : (
                    <DetailedDescription description={transaction.description} />
                )}
            </td>
             <td className="p-2 text-right text-xs">
                {transaction.notes}
            </td>
            <td className="p-2 font-mono font-bold text-red-600">{transaction.debit > 0 ? formatCurrency(transaction.debit, transaction.currency) : '-'}</td>
            <td className="p-2 font-mono font-bold text-green-600">{transaction.credit > 0 ? formatCurrency(transaction.credit, transaction.currency) : '-'}</td>
            <td className="p-2 font-mono text-center">
                <Badge variant={transaction.currency === 'USD' ? 'default' : 'secondary'} className={cn(transaction.currency === 'USD' && 'bg-accent text-accent-foreground')}>{transaction.currency}</Badge>
            </td>
            <td className={cn("p-2 font-mono font-bold", transaction.balance < 0 ? 'text-red-600' : 'text-green-600')}>{formatCurrency(transaction.balance, transaction.currency)}</td>
            <td className="p-2 text-xs">{transaction.officer}</td>
             <td className="p-2 text-center">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </td>
        </tr>
    );
};


export default function ReportTable({ transactions, reportType }: { transactions: ReportTransaction[], reportType?: 'summary' | 'detailed' }) {
    
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
                {transactions.map(tx => (
                    <TransactionRow key={tx.id} transaction={tx} />
                ))}
             </TableBody>
        </Table>
    );
}

      