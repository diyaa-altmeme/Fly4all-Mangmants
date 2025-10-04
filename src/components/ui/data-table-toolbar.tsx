
"use client"

import { type Table } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { BadgeCheck, CircleDollarSign } from "lucide-react"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

const statusOptions = [
    { label: "قيد الإدخال", value: "draft", },
    { label: "مدخلة", value: "entered", },
    { label: "مدققة", value: "audited", },
]

const currencyOptions = [
    { label: "USD", value: "USD" },
    { label: "IQD", value: "IQD" },
]

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="بحث..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="الحالة"
            icon={BadgeCheck}
            options={statusOptions}
          />
        )}
        {table.getColumn("currency") && (
          <DataTableFacetedFilter
            column={table.getColumn("currency")}
            title="العملة"
            icon={CircleDollarSign}
            options={currencyOptions}
          />
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
