

"use client"

import * as React from "react"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BoxFlowReportEntry } from "../../actions"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const columns: ColumnDef<BoxFlowReportEntry>[] = [
    {
        accessorKey: 'boxName',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>الصندوق <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
    },
    {
        accessorKey: 'openingBalance',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>الرصيد الافتتاحي <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        cell: ({ row }) => <div className="text-center font-mono">{formatCurrency(row.original.openingBalance)}</div>,
    },
    {
        accessorKey: 'totalInflow',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>إجمالي الإيداعات <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        cell: ({ row }) => <div className="text-center font-mono text-green-600">{formatCurrency(row.original.totalInflow)}</div>,
    },
    {
        accessorKey: 'totalOutflow',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>إجمالي السحوبات <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        cell: ({ row }) => <div className="text-center font-mono text-red-600">{formatCurrency(row.original.totalOutflow)}</div>,
    },
    {
        accessorKey: 'closingBalance',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>الرصيد الختامي <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        cell: ({ row }) => <div className="text-center font-bold font-mono">{formatCurrency(row.original.closingBalance)}</div>,
    },
];

interface BoxFlowReportTableProps {
  data: BoxFlowReportEntry[]
}

export default function BoxFlowReportTable({ data }: BoxFlowReportTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
      { id: 'closingBalance', desc: true }
  ])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="rounded-md border mt-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} className="text-center font-bold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-center">
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
  )
}
