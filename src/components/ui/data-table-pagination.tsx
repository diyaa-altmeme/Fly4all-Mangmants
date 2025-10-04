
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

interface DataTablePaginationProps<TData> {
  table?: Table<TData>
  className?: string
  totalRows?: number;
  totalCount?: number;
  pageIndex?: number;
  pageSize?: number;
  onPageChange?: (index: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function DataTablePagination<TData>({
  table,
  className,
  totalRows,
  totalCount,
  pageIndex: pageIndexProp,
  pageSize: pageSizeProp,
  onPageChange: onPageChangeProp,
  onPageSizeChange: onPageSizeChangeProp,
}: DataTablePaginationProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (pageIndex: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', (pageIndex + 1).toString());
      router.push(`${pathname}?${params.toString()}`);
  }

  const handlePageSizeChange = (size: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('limit', size.toString());
      params.set('page', '1'); // Reset to first page
      router.push(`${pathname}?${params.toString()}`);
  }
  
  const isServerPaginated = totalRows !== undefined;

  // Use props for controlled pagination if provided, otherwise use table state
  const pageIndex = pageIndexProp ?? table?.getState().pagination.pageIndex ?? 0;
  const pageSize = pageSizeProp ?? table?.getState().pagination.pageSize ?? 10;
  const pageCount = totalCount !== undefined 
    ? Math.ceil(totalCount / pageSize)
    : (isServerPaginated && totalRows)
      ? Math.ceil(totalRows / pageSize)
      : table?.getPageCount() ?? -1;

  const canPreviousPage = isServerPaginated 
    ? pageIndex > 0 
    : table?.getCanPreviousPage() ?? pageIndex > 0;
    
  const canNextPage = isServerPaginated
    ? pageIndex < pageCount - 1
    : table?.getCanNextPage() ?? (pageCount !== -1 && pageIndex < pageCount - 1);

  const setPageIndex = onPageChangeProp ?? table?.setPageIndex;
  const setPageSize = onPageSizeChangeProp ?? table?.setPageSize;


  return (
    <div
      className={cn(
        "flex flex-col-reverse items-center justify-between gap-4 sm:flex-row sm:gap-6 lg:gap-8",
        className
      )}
    >
      <div className="flex-1 text-sm text-muted-foreground">
        {table?.getFilteredSelectedRowModel().rows.length} من{" "}
        {isServerPaginated ? totalRows : table?.getFilteredRowModel().rows.length} صفوف مختارة.
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2 space-x-reverse">
          <p className="text-sm font-medium">صفوف لكل صفحة</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              isServerPaginated ? handlePageSizeChange(Number(value)) : setPageSize?.(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 50].map((size) => (
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
            onClick={() => isServerPaginated ? handlePageChange(0) : setPageIndex?.(0)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => isServerPaginated ? handlePageChange(pageIndex - 1) : setPageIndex?.(pageIndex - 1)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => isServerPaginated ? handlePageChange(pageIndex + 1) : setPageIndex?.(pageIndex + 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => isServerPaginated ? handlePageChange(pageCount - 1) : setPageIndex?.(pageCount - 1)}
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

    