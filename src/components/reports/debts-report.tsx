
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import type { Client, Currency, DebtsReportData, DebtsReportEntry } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getDebtsReportData } from '@/app/reports/actions';
import { MoreHorizontal, Search, Download, Calendar as CalendarIcon, Filter, Loader2, ListOrdered, ArrowUpRight, ArrowDownLeft, FileText, HandCoins, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable, type ColumnDef, getSortedRowModel, SortingState } from '@tanstack/react-table';
import { DataTablePagination } from '../ui/data-table-pagination';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';


const formatCurrencyDisplay = (amount: number) => {
    if (Math.abs(amount) < 0.01) return '0.00';
    const formattedAmount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return formattedAmount;
};

const StatCard = ({ title, usd, iqd, className }: { title: string; usd: number; iqd: number, className?: string }) => (
    <div className={cn("p-4 bg-muted rounded-lg text-center", className)}>
        <p className="text-sm text-muted-foreground font-bold">{title}</p>
        <p className="font-bold font-mono text-lg">{formatCurrencyDisplay(usd)} USD</p>
        <p className="font-bold font-mono text-lg">{formatCurrencyDisplay(iqd)} IQD</p>
    </div>
);


const getColumns = (): ColumnDef<DebtsReportEntry>[] => [
    {
        accessorKey: 'name',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>اسم الحساب<ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        cell: ({ row }) => (
             <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${row.original.name.substring(0,1)}`} data-ai-hint="logo" />
                    <AvatarFallback>{row.original.name.substring(0,1)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{row.original.name}</p>
                    <p className="text-xs text-muted-foreground">{row.original.phone}</p>
                </div>
            </div>
        )
    },
    {
        accessorKey: 'accountType',
        header: 'النوع',
        cell: ({ row }) => {
            const type = row.original.accountType;
            if (type === 'both') return <div className="text-center"><Badge variant="secondary">عميل ومورد</Badge></div>;
            if (type === 'supplier') return <div className="text-center"><Badge variant="outline">مورد</Badge></div>;
            return <div className="text-center"><Badge>عميل</Badge></div>;
        }
    },
    {
        id: 'balanceUSD',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>الرصيد (USD)<ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        accessorFn: row => row.balanceUSD || 0,
        cell: ({ row }) => {
            const balance = row.original.balanceUSD || 0;
            const isDebitForUs = (row.original.accountType === 'supplier' && balance > 0) || (row.original.accountType === 'client' && balance < 0);
            const isCreditForUs = (row.original.accountType === 'client' && balance > 0) || (row.original.accountType === 'supplier' && balance < 0);
             
            let colorClass = 'text-foreground';
            if (isDebitForUs) colorClass = 'text-green-600'; // We are owed money
            if (isCreditForUs) colorClass = 'text-red-600'; // We owe money


            return <div className={cn("text-center font-mono font-bold", colorClass)}>{formatCurrencyDisplay(balance)}</div>
        }
    },
    {
        id: 'balanceIQD',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>الرصيد (IQD)<ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        accessorFn: row => row.balanceIQD || 0,
        cell: ({ row }) => {
            const balance = row.original.balanceIQD || 0;
            const isDebitForUs = (row.original.accountType === 'supplier' && balance > 0) || (row.original.accountType === 'client' && balance < 0);
            const isCreditForUs = (row.original.accountType === 'client' && balance > 0) || (row.original.accountType === 'supplier' && balance < 0);
            
            let colorClass = 'text-foreground';
            if (isDebitForUs) colorClass = 'text-green-600';
            if (isCreditForUs) colorClass = 'text-red-600';

            return <div className={cn("text-center font-mono font-bold", colorClass)}>{formatCurrencyDisplay(balance)}</div>
        }
    },
    {
        id: 'lastTransaction',
        header: 'آخر حركة',
        accessorFn: row => row.lastTransaction,
        cell: ({row}) => <div className="text-center">{row.original.lastTransaction ? format(parseISO(row.original.lastTransaction), 'yyyy-MM-dd') : '-'}</div>
    },
    {
        id: 'actions',
        header: () => <div className="text-center">الإجراءات</div>,
        cell: ({ row }) => (
             <div className="text-center">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/reports/account-statement?accountId=${row.original.id}`}><FileText className="me-2 h-4 w-4"/>كشف حساب</Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem disabled>
                           <HandCoins className="me-2 h-4 w-4"/>تسديد/دفع
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
            </div>
        )
    }
]

interface DebtsReportProps {
    initialData: DebtsReportEntry[];
}

export default function DebtsReport({ initialData }: DebtsReportProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'client' | 'supplier' | 'both'>('all');
    const [balanceStatusFilter, setBalanceStatusFilter] = useState<'all' | 'debit' | 'credit'>('all');
    const [hideZeroBalances, setHideZeroBalances] = useState(false);
    const [sorting, setSorting] = React.useState<SortingState>([])
    const columns = useMemo(() => getColumns(), []);
    const { toast } = useToast();

    const filteredEntries = useMemo(() => {
        if (!initialData) return [];
        return initialData.filter(entry => {
            if (accountTypeFilter !== 'all' && entry.accountType !== accountTypeFilter) return false;
            
            if (balanceStatusFilter !== 'all') {
                const balanceUSD = entry.balanceUSD || 0;
                const isDebitForUs = (entry.accountType === 'client' && balanceUSD < 0) || (entry.accountType === 'supplier' && balanceUSD > 0);
                const isCreditForUs = (entry.accountType === 'client' && balanceUSD > 0) || (entry.accountType === 'supplier' && balanceUSD < 0);

                if (balanceStatusFilter === 'debit' && !isDebitForUs) return false;
                if (balanceStatusFilter === 'credit' && !isCreditForUs) return false;
            }

            if (hideZeroBalances) {
                if ((entry.balanceUSD || 0) === 0 && (entry.balanceIQD || 0) === 0) {
                    return false;
                }
            }

            if (searchTerm && !(entry.name.toLowerCase().includes(searchTerm.toLowerCase()) || entry.phone?.includes(searchTerm))) {
                return false;
            }
            return true;
        });
    }, [initialData, searchTerm, accountTypeFilter, balanceStatusFilter, hideZeroBalances]);
    
    const table = useReactTable({
        data: filteredEntries,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const summary = useMemo(() => {
        return filteredEntries.reduce((acc, entry) => {
            const balanceUSD = entry.balanceUSD || 0;
            const balanceIQD = entry.balanceIQD || 0;
            
             if ((entry.accountType === 'client' || entry.accountType === 'both')) {
                if (balanceUSD > 0) acc.totalCreditUSD += balanceUSD; else acc.totalDebitUSD -= balanceUSD;
                if (balanceIQD > 0) acc.totalCreditIQD += balanceIQD; else acc.totalDebitIQD -= balanceIQD;
            } else { // Supplier
                if (balanceUSD < 0) acc.totalCreditUSD -= balanceUSD; else acc.totalDebitUSD += balanceUSD;
                if (balanceIQD < 0) acc.totalCreditIQD -= balanceIQD; else acc.totalDebitIQD += balanceIQD;
            }
            
            return acc;
        }, { totalDebitUSD: 0, totalCreditUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0 });
    }, [filteredEntries]);
    
    const netBalanceUSD = summary.totalCreditUSD - summary.totalDebitUSD;
    const netBalanceIQD = summary.totalCreditIQD - summary.totalDebitIQD;

    return (
        <Card>
            <CardHeader>
                <div className="flex w-full flex-col items-start gap-4">
                     <div>
                        <CardTitle className="font-bold">تقرير الأرصدة النهائية</CardTitle>
                        <CardDescription>
                            نظرة شاملة ومباشرة على جميع أرصدة العملاء والموردين. يتم تحديث الأرصدة تلقائيًا مع كل عملية مالية.
                        </CardDescription>
                    </div>
                     <div className="w-full flex flex-col sm:flex-row gap-2">
                         <div className="relative flex-grow">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                             <Input placeholder="بحث بالاسم أو الهاتف..." className="ps-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                         </div>
                        <div className="flex gap-2">
                            <Select value={accountTypeFilter} onValueChange={(v) => setAccountTypeFilter(v as any)}>
                                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الأنواع</SelectItem>
                                    <SelectItem value="client">عملاء فقط</SelectItem>
                                    <SelectItem value="supplier">موردين فقط</SelectItem>
                                </SelectContent>
                            </Select>
                             <Select value={balanceStatusFilter} onValueChange={(v) => setBalanceStatusFilter(v as any)}>
                                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الأرصدة</SelectItem>
                                    <SelectItem value="debit">مطلوب لنا</SelectItem>
                                    <SelectItem value="credit">مطلوب منا</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox id="hide-zero" checked={hideZeroBalances} onCheckedChange={(checked) => setHideZeroBalances(!!checked)} />
                            <Label htmlFor="hide-zero" className="font-bold">إخفاء الأرصدة الصفرية</Label>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="إجمالي مطلوب لنا (دائنون لنا)" usd={summary.totalCreditUSD} iqd={summary.totalCreditIQD} className="border-green-500/50 bg-green-50 dark:bg-green-950/30" />
                    <StatCard title="إجمالي مطلوب منا (مدينون لنا)" usd={summary.totalDebitUSD} iqd={summary.totalDebitIQD} className="border-red-500/50 bg-red-50 dark:bg-red-950/30" />
                    <StatCard title="صافي الرصيد الإجمالي" usd={netBalanceUSD} iqd={netBalanceIQD} className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30" />
                </div>
                
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <TableHead key={header.id} className="text-center font-bold">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">لا توجد نتائج تطابق الفلتر.</TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows.map(row => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="text-center">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                 <DataTablePagination table={table} />
            </CardContent>
        </Card>
    );
}
