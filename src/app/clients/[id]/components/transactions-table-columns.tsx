
"use client";

import { ColumnDef } from "@tanstack/react-table"
import type { ReportTransaction } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { format, isValid, parseISO } from "date-fns"
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Ticket, FileText } from "lucide-react";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
};

export const getColumns = (visibleColumns: string[]): ColumnDef<ReportTransaction>[] => {

    const allColumns: ColumnDef<ReportTransaction>[] = [
        {
            accessorKey: "date",
            header: "التاريخ",
            cell: ({ row }) => {
                const date = parseISO(row.original.date);
                return isValid(date) ? format(date, 'yyyy-MM-dd') : '-';
            }
        },
        {
            accessorKey: "type",
            header: "النوع",
             cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge>
        },
        {
            accessorKey: "invoiceNumber",
            header: "رقم الفاتورة",
        },
        {
            accessorKey: "description",
            header: "البيان",
            cell: ({ row }) => {
                const desc = row.original.description;
                if(typeof desc === 'string') {
                    return <span className="text-xs">{desc}</span>
                }
                return <span className="text-xs">{desc.title}</span>
            }
        },
        {
            accessorKey: "debit",
            header: "مدين",
            cell: ({ row }) => <span className="font-mono text-red-600">{formatCurrency(row.original.debit)}</span>
        },
        {
            accessorKey: "credit",
            header: "دائن",
            cell: ({ row }) => <span className="font-mono text-green-600">{formatCurrency(row.original.credit)}</span>
        }
    ];
    
    return allColumns.filter(col => visibleColumns.includes(col.id as string || col.accessorKey as string));
}

// Mobile-friendly card component for a single transaction
export const TransactionCard = ({ transaction }: { transaction: ReportTransaction }) => {
    const isDebit = transaction.debit > 0;
    const amount = isDebit ? transaction.debit : transaction.credit;
    const Icon = transaction.type.includes('حجز') || transaction.type.includes('فيزا') ? Ticket : FileText;
    const date = parseISO(transaction.date);
    const formattedDate = isValid(date) ? format(date, 'yyyy-MM-dd') : '-';

    return (
        <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
                 <div className={cn("p-3 rounded-full", isDebit ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30')}>
                    <Icon className={cn("h-6 w-6", isDebit ? 'text-red-500' : 'text-green-500')} />
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-center">
                        <p className="font-bold">{transaction.type}</p>
                        <p className={cn("font-mono text-lg font-bold", isDebit ? 'text-red-600' : 'text-green-600')}>
                            {formatCurrency(amount)} {transaction.currency}
                        </p>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1 mt-1">
                        {typeof transaction.description === 'string' ? (
                            <p>{transaction.description}</p>
                        ) : (
                            <p>{transaction.description.title}</p>
                        )}
                        <p>
                            <span>{formattedDate}</span>
                            {transaction.invoiceNumber && 
                                <>
                                    <span className="mx-2">|</span>
                                    <span>فاتورة: {transaction.invoiceNumber}</span>
                                </>
                            }
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
