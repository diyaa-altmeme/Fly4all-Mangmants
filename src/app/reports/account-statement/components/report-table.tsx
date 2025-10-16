
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

const TransactionRow = ({ transaction }: { transaction: ReportTransaction }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const isDetailedDescription = typeof transaction.description === 'object';
    let descriptionText = '';
    if (isDetailedDescription) {
        descriptionText = (transaction.description as StructuredDescription).title;
    } else {
        descriptionText = transaction.description;
    }


    return (
        <Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
            <tbody className="border-t">
                <TableRow className="text-sm">
                    <TableCell className="p-2 w-10">
                        {isDetailedDescription && (
                             <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                        )}
                    </TableCell>
                    <TableCell className="p-2 font-mono">{format(parseISO(transaction.date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell className="p-2">{transaction.invoiceNumber}</TableCell>
                    <TableCell className="p-2">{transaction.type}</TableCell>
                    <TableCell className="p-2 text-right">{descriptionText}</TableCell>
                    <TableCell className="p-2 text-right font-mono text-red-600">{transaction.debit > 0 ? formatCurrency(transaction.debit, transaction.currency) : '-'}</TableCell>
                    <TableCell className="p-2 text-right font-mono text-green-600">{transaction.credit > 0 ? formatCurrency(transaction.credit, transaction.currency) : '-'}</TableCell>
                    <TableCell className="p-2 text-right font-mono font-semibold">{formatCurrency(transaction.balance, transaction.currency)}</TableCell>
                    <TableCell className="p-2 text-xs">{transaction.officer}</TableCell>
                </TableRow>
                {isDetailedDescription && (
                    <CollapsibleContent asChild>
                         <TableRow>
                            <TableCell colSpan={9} className="p-0">
                                <div className="p-3 bg-muted/50 text-xs">
                                    <h4 className="font-bold mb-1">{(transaction.description as StructuredDescription).title}</h4>
                                     {(transaction.description as StructuredDescription).totalReceived && <p className="text-muted-foreground">{(transaction.description as StructuredDescription).totalReceived}</p>}
                                    {(transaction.description as StructuredDescription).selfReceipt && <p className="text-green-600 font-semibold">{(transaction.description as StructuredDescription).selfReceipt}</p>}
                                    {(transaction.description as StructuredDescription).distributions?.map((d, i) => (
                                        <div key={i} className="flex justify-between items-center text-muted-foreground">
                                            <span>{d.name}</span>
                                            <span className="font-mono">{d.amount}</span>
                                        </div>
                                    ))}
                                    {(transaction.description as StructuredDescription).notes && <p className="text-muted-foreground border-t mt-1 pt-1">{(transaction.description as StructuredDescription).notes}</p>}
                                </div>
                            </TableCell>
                        </TableRow>
                    </CollapsibleContent>
                )}
            </tbody>
        </Collapsible>
    );
};


export default function ReportTable({ transactions, reportType }: { transactions: ReportTransaction[], reportType?: 'summary' | 'detailed' }) {
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="p-2 w-10"></TableHead>
                    <TableHead className="p-2">التاريخ</TableHead>
                    <TableHead className="p-2">رقم الفاتورة</TableHead>
                    <TableHead className="p-2">النوع</TableHead>
                    <TableHead className="p-2 text-right">البيان</TableHead>
                    <TableHead className="p-2 text-right">مدين</TableHead>
                    <TableHead className="p-2 text-right">دائن</TableHead>
                    <TableHead className="p-2 text-right">الرصيد</TableHead>
                    <TableHead className="p-2">الموظف</TableHead>
                </TableRow>
            </TableHeader>
            {transactions.map(tx => (
                <TransactionRow key={tx.id} transaction={tx} />
            ))}
        </Table>
    );
}
