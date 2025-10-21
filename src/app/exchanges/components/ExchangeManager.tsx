"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Exchange, UnifiedLedgerEntry } from '@/lib/types';
import { getUnifiedExchangeLedger, updateBatch } from "../actions";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Button,
} from "@/components/ui/button";
import {
  Checkbox
} from "@/components/ui/checkbox";
import {
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState } from '@tanstack/react-table';

const formatCurrency = (amount?: number, currency = "USD") => {
  if (amount == null) return "-";
  return (
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`
  );
};

const getColumns = (
  setUnifiedLedger: any,
  onConfirmChange: (id: string, entryType: string, checked: boolean) => Promise<void>
): ColumnDef<UnifiedLedgerEntry>[] => [
  {
    id: 'details',
    cell: ({ row }) => {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      )
    }
  },
  {
    id: 'isConfirmed',
    header: 'تأكيد',
    cell: ({ row }) => {
      const [isPending, setIsPending] = React.useState(false);
      const [dialogOpen, setDialogOpen] = React.useState(false);

      const confirmChange = async (checked: boolean) => {
        setIsPending(true);
        await onConfirmChange(row.original.id, row.original.entryType, checked);
        setIsPending(false);
      };

      const confirmUncheck = () => {
        setDialogOpen(false);
        confirmChange(false);
      };

      return (
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الإلغاء</AlertDialogTitle>
              <AlertDialogDescription>هل تريد إلغاء تأكيد هذه الدفعة؟</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>رجوع</AlertDialogCancel>
              <AlertDialogAction onClick={confirmUncheck}>نعم، قم بالإلغاء</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          <Checkbox
            checked={row.original.isConfirmed}
            onCheckedChange={(checked) => {
              if (row.original.isConfirmed && !checked) {
                setDialogOpen(true);
              } else {
                confirmChange(true);
              }
            }}
            disabled={isPending}
          />
        </AlertDialog>
      );
    },
  },
  {
    accessorKey: 'invoiceNumber',
    header: 'الفاتورة',
    cell: ({ row }) => <span className="font-bold">{row.original.invoiceNumber}</span>,
  },
  {
    accessorKey: 'date',
    header: 'التاريخ',
    cell: ({ row }) => <span>{format(parseISO(row.original.date), "yyyy-MM-dd")}</span>,
  },
  {
    id: 'entryType',
    header: 'النوع',
    cell: ({ row }) => {
      const entry = row.original;
      if (entry.entryType === 'transaction') {
        return <Badge variant="destructive">دين</Badge>;
      } else {
        const amount = entry.totalAmount || 0;
        return amount > 0 ? (
          <Badge className="bg-blue-500 text-white">تسديد</Badge>
        ) : (
          <Badge className="bg-green-500 text-white">قبض</Badge>
        );
      }
    },
  },
  {
    accessorKey: 'description',
    header: 'الوصف',
  },
  {
    id: 'debit',
    header: 'علينا',
    cell: ({ row }) => {
      const entry = row.original;
      const amount = entry.totalAmount || 0;
      const debit = entry.entryType === 'transaction' ? Math.abs(amount) : (amount < 0 ? Math.abs(amount) : 0);
      return <span className="text-red-600 font-bold">{debit > 0 ? formatCurrency(debit) : '-'}</span>;
    },
  },
  {
    id: 'credit',
    header: 'لنا',
    cell: ({ row }) => {
      const entry = row.original;
      const amount = entry.totalAmount || 0;
      const credit = entry.entryType === 'payment' && amount > 0 ? amount : 0;
      return <span className="text-green-600 font-bold">{credit > 0 ? formatCurrency(credit) : '-'}</span>;
    },
  },
  {
    accessorKey: 'userName',
    header: 'المستخدم',
  },
];


export default function ExchangeManager({ initialExchanges, initialExchangeId }: { initialExchanges: any[]; initialExchangeId: string; }) {
  const { toast } = useToast();
  const [exchangeId, setExchangeId] = useState(initialExchangeId || "");
  const [unifiedLedger, setUnifiedLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);

  const fetchData = useCallback(async () => {
    if (!exchangeId) return;
    setLoading(true);
    try {
      const data = await getUnifiedExchangeLedger(exchangeId);
      setUnifiedLedger(data);
    } catch (err: any) {
      toast({ title: "خطأ في تحميل البيانات", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [exchangeId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmChange = async (id: string, entryType: string, checked: boolean) => {
    try {
      const result = await updateBatch(id, entryType as "transaction" | "payment", { isConfirmed: checked });
      if (!result.success) throw new Error(result.error);
      setUnifiedLedger((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isConfirmed: checked } : item))
      );
      toast({ title: `تم ${checked ? 'تأكيد' : 'إلغاء تأكيد'} الدفعة` });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
       setUnifiedLedger((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isConfirmed: !checked } : item))
      );
    }
  };
  
  const columns = useMemo(() => getColumns(setUnifiedLedger, handleConfirmChange), [setUnifiedLedger, handleConfirmChange]);

  const table = useReactTable({
    data: unifiedLedger,
    columns,
    pageCount: Math.ceil(unifiedLedger.length / pagination.pageSize),
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false, // Let the table handle it
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>إدارة المعاملات</CardTitle>
          <CardDescription>تأكيد المعاملات بدون فقدان الصفحة مع عرض التفاصيل</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id} className="text-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-10">
                      لا توجد بيانات.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map(row => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id} className="text-center">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination table={table} />
        </CardContent>
      </Card>
    </div>
  );
}
    