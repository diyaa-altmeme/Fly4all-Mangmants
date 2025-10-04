

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ReconciliationLog } from "@/lib/types"
import { ArrowUpDown, CheckCircle, AlertTriangle, XCircle, BarChartHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import Link from "next/link"

export const columns: ColumnDef<ReconciliationLog>[] = [
  {
    accessorKey: "runAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          تاريخ العملية
          <ArrowUpDown className="ms-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        return <div className="text-center">{format(parseISO(row.original.runAt), 'yyyy-MM-dd HH:mm')}</div>
    }
  },
  {
    accessorKey: "userName",
    header: () => <div className="text-center">المستخدم</div>,
    cell: ({ row }) => <div className="text-center">{row.original.userName}</div>
  },
  {
    id: 'summary',
    header: () => <div className="text-center">ملخص</div>,
    cell: ({ row }) => {
      const summary = row.original.summary;
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs justify-center">
          <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-green-500"/> متطابق: {summary.matched}</span>
          <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-yellow-500"/> جزئي: {summary.partialMatch}</span>
          <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3 text-red-500"/> مفقود لدى المورد: {summary.missingInSupplier}</span>
          <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3 text-orange-500"/> مفقود في الشركة: {summary.missingInCompany}</span>
        </div>
      )
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="text-center">
            <Button asChild variant="outline" size="sm">
                <Link href={`/reconciliation/history/${row.original.id}`}>
                    <BarChartHorizontal className="me-2 h-4 w-4" />
                    عرض التفاصيل
                </Link>
            </Button>
        </div>
      )
    },
  },
]
