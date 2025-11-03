
"use client"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"
import { type Table } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface DataTablePaginationProps {
  table?: Table<any>; // Optional for client-side pagination
  totalRows: number;
  pageSize: number;
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function DataTablePagination({
  table,
  totalRows,
  pageSize,
  pageIndex,
  onPageChange,
  onPageSizeChange,
  className,
}: DataTablePaginationProps) {
  const pageCount = Math.ceil(totalRows / pageSize);

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;
  
  return (
    <div
      className={cn(
        "flex flex-col-reverse items-center justify-between gap-4 sm:flex-row sm:gap-6 lg:gap-8",
        className
      )}
    >
      <div className="flex-1 text-sm text-muted-foreground">
        {table?.getFilteredSelectedRowModel().rows.length ?? 0} من{" "}
        {totalRows} صفوف مختارة.
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2 space-x-reverse">
          <p className="text-sm font-medium">صفوف لكل صفحة</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPageSizeChange(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 15, 20, 30, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          صفحة {pageIndex + 1} من{" "}
          {pageCount}
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(0)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
    