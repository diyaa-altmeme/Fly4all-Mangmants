

"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  getFacetedRowModel,
  getFacetedUniqueValues
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReconciledRecord } from "@/lib/reconciliation";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUpDown, CheckCircle, AlertTriangle, XCircle, Search, Filter } from "lucide-react";
import type { MatchingField } from "@/lib/reconciliation";
import { DataTableFacetedFilter } from "../ui/data-table-faceted-filter";
import { DataTablePagination } from "../ui/data-table-pagination";

const statusConfig = {
    MATCHED: { label: "مطابق", icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300" },
    PARTIAL_MATCH: { label: "شبه مطابق", icon: AlertTriangle, className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300" },
    MISSING_IN_SUPPLIER: { label: "مفقود لدى المورد", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300" },
    MISSING_IN_COMPANY: { label: "مفقود في نظامك", icon: XCircle, className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300" },
};

export default function ResultsTable({ data, settingsFields }: { data: ReconciledRecord[], settingsFields: MatchingField[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = React.useState('');

    const columns = React.useMemo<ColumnDef<ReconciledRecord>[]>(() => [
        {
            accessorKey: "status",
            header: () => <div className="font-bold text-center">الحالة</div>,
            cell: ({ row }) => {
                const status = row.original.status;
                const config = statusConfig[status];
                if (!config) return null;
                return (
                    <Badge variant="outline" className={cn("whitespace-nowrap", config.className)}>
                        <config.icon className="me-2 h-4 w-4" />
                        {config.label}
                    </Badge>
                );
            },
            filterFn: (row, id, value) => {
              return value.includes(row.getValue(id))
            },
        },
        ...settingsFields.filter(f => f.enabled).map(field => ({
            accessorKey: field.id,
            header: () => <div className="font-bold text-center">{field.label}</div>,
             cell: ({ row }: { row: any }) => {
                const value = row.original[field.id];
                 if (value === undefined || value === null) return <div className="text-center">-</div>;
                if (field.dataType === 'number') {
                    return <div className="font-mono text-center">{Number(value).toFixed(2)}</div>
                }
                return <div className="text-center">{value}</div>;
            }
        })),
        {
             accessorKey: "details",
             header: () => <div className="font-bold text-center">تفاصيل الاختلاف</div>,
             cell: ({ row }) => <div className="text-xs text-muted-foreground text-center">{row.original.details || '-'}</div>
        }
    ], [settingsFields]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
    });

    return (
        <div className="mt-4">
             <div className="flex items-center py-4 gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input
                        placeholder="ابحث في جميع الحقول..."
                        value={globalFilter ?? ""}
                        onChange={(event) => setGlobalFilter(String(event.target.value))}
                        className="w-full sm:max-w-xs ps-10"
                    />
                </div>
                 {table.getColumn("status") && (
                    <DataTableFacetedFilter
                        column={table.getColumn("status")}
                        title="الحالة"
                        icon={Filter}
                        options={Object.entries(statusConfig).map(([key, value]) => ({
                            value: key,
                            label: value.label,
                            icon: value.icon
                        }))}
                    />
                )}
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    لا توجد نتائج.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
             <DataTablePagination table={table} className="mt-4" />
        </div>
    );
}
