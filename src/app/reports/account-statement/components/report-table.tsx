
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ReportTransaction, StructuredDescription } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button";
import { ChevronDown, Info } from "lucide-react";


const formatCurrency = (amount: number, currency: string) => {
  if (Math.abs(amount) < 0.01) return `0.00`;
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
};

const DetailedDescription = ({ description }: { description: StructuredDescription }) => (
    <div className="space-y-1 text-xs">
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
        {description.notes && <p className="text-muted-foreground border-t mt-1 pt-1">{description.notes}</p>}
    </div>
);


const TransactionRow = ({ transaction }: { transaction: ReportTransaction }) => {
    const isDetailedDescription = typeof transaction.description === 'object' && transaction.description !== null;

    return (
        <tr className="text-sm">
            <td className="p-2 font-mono">{format(parseISO(transaction.date), 'yyyy-MM-dd')}</td>
            <td className="p-2">{transaction.invoiceNumber}</td>
            <td className="p-2">{transaction.type}</td>
            <td className="p-2 text-right">
                {isDetailedDescription ? (
                    <DetailedDescription description={transaction.description as StructuredDescription} />
                ) : (
                    transaction.description
                )}
            </td>
            <td className="p-2 text-right font-mono text-red-600">{transaction.debit > 0 ? formatCurrency(transaction.debit, transaction.currency) : '-'}</td>
            <td className="p-2 text-right font-mono text-green-600">{transaction.credit > 0 ? formatCurrency(transaction.credit, transaction.currency) : '-'}</td>
            <td className={cn("p-2 text-right font-mono font-semibold", transaction.balance < 0 ? 'text-red-600' : 'text-green-600')}>{formatCurrency(transaction.balance, transaction.currency)}</td>
            <td className="p-2 text-xs">{transaction.officer}</td>
        </tr>
    );
};


export default function ReportTable({ transactions, reportType }: { transactions: ReportTransaction[], reportType?: 'summary' | 'detailed' }) {
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="p-2">التاريخ</TableHead>
                    <TableHead className="p-2">رقم الفاتورة</TableHead>
                    <TableHead className="p-2">النوع</TableHead>
                    <TableHead className="p-2 text-right w-[40%]">البيان</TableHead>
                    <TableHead className="p-2 text-right">مدين</TableHead>
                    <TableHead className="p-2 text-right">دائن</TableHead>
                    <TableHead className="p-2 text-right">الرصيد</TableHead>
                    <TableHead className="p-2">الموظف</TableHead>
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
