
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
import type { ClientProfitReportEntry } from "../../actions"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const columns: ColumnDef<ClientProfitReportEntry>[] = [
    {
        accessorKey: 'clientName',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>العميل <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
    },
    {
        accessorKey: 'totalBookings',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>عدد الحجوزات <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        cell: ({ row }) => <div className="text-center">{row.original.totalBookings}</div>,
    },
    {
        accessorKey: 'totalSales',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>إجمالي المبيعات <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        cell: ({ row }) => <div className="text-center font-mono">{formatCurrency(row.original.totalSales)}</div>,
    },
    {
        accessorKey: 'totalCost',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>إجمالي التكلفة <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        cell: ({ row }) => <div className="text-center font-mono">{formatCurrency(row.original.totalCost)}</div>,
    },
    {
        accessorKey: 'totalProfit',
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>صافي الربح <ArrowUpDown className="ms-2 h-4 w-4" /></Button>,
        cell: ({ row }) => <div className="text-center font-bold text-green-600 font-mono">{formatCurrency(row.original.totalProfit)}</div>,
    },
];

interface ClientProfitReportTableProps {
  data: ClientProfitReportEntry[]
}

export default function ClientProfitReportTable({ data }: ClientProfitReportTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
      { id: 'totalProfit', desc: true }
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
