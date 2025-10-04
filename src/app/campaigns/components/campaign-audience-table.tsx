
"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WhatsappContact, WhatsappGroup, WhatsappGroupParticipant, WhatsappAccount } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus } from "lucide-react";
import AddGroupParticipantsDialog from "./add-group-participants-dialog";
import { Button } from "@/components/ui/button";


interface CampaignAudienceTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onSelectionChange: (selected: TData[]) => void;
  searchColumn: string;
  accountId?: string;
  contacts?: WhatsappContact[];
}

export function CampaignAudienceTable<TData extends {id: string}, TValue>({
  columns,
  data,
  onSelectionChange,
  searchColumn,
  accountId,
  contacts
}: CampaignAudienceTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
    },
    meta: {
      accountId,
      contacts
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  
   React.useEffect(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
    onSelectionChange(selectedRows);
  }, [rowSelection, onSelectionChange, table]);


  return (
    <div className="space-y-4">
       <Input
          placeholder="بحث..."
          value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(searchColumn)?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
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
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  لا توجد نتائج.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
       <DataTablePagination table={table} />
    </div>
  );
}

export const contactColumns: ColumnDef<WhatsappContact>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: "name",
    header: "الاسم",
    cell: ({ row }) => (
        <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
                <AvatarImage src={undefined} alt={row.original.name} />
                <AvatarFallback>{row.original.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold">{row.original.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{row.original.id.split('@')[0]}</p>
            </div>
        </div>
    )
  },
];

export const groupColumns: ColumnDef<WhatsappGroup>[] = [
 {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: "name",
    header: "اسم المجموعة",
     cell: ({ row }) => (
        <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 bg-muted">
                 <AvatarFallback><Users className="h-5 w-5 text-muted-foreground"/></AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold">{row.original.name}</p>
                <p className="text-xs text-muted-foreground">{row.original.id.split('@')[0]}</p>
            </div>
        </div>
    )
  },
   {
    accessorKey: "participantsCount",
    header: "عدد الأعضاء",
     cell: ({row}) => <span className="font-semibold">{row.original.participantsCount || 0}</span>
  },
  {
    id: 'actions',
    header: 'إجراءات',
    cell: ({ row, table }) => {
        const { accountId, contacts } = table.options.meta as { accountId: string, contacts: WhatsappContact[] };
        const group = row.original;
        
        if (!group.iAmAdmin) return null;

        return (
            <AddGroupParticipantsDialog 
                accountId={accountId} 
                groupId={group.id} 
                groupName={group.name}
                allContacts={contacts || []}
            >
                <Button variant="outline" size="sm">
                    <UserPlus className="me-2 h-4 w-4"/>
                    إضافة أعضاء
                </Button>
            </AddGroupParticipantsDialog>
        )
    }
  }
];

export const groupParticipantColumns: ColumnDef<WhatsappGroupParticipant>[] = [
 {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: "name",
    header: "اسم العضو",
    cell: ({row}) => (
         <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
                <AvatarImage src={undefined} alt={row.original.name} />
                <AvatarFallback>{row.original.name ? row.original.name.charAt(0) : 'U'}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold">{row.original.name || 'غير معروف'}</p>
                 <p className="text-xs text-muted-foreground font-mono">{row.original.id.split('@')[0]}</p>
            </div>
        </div>
    )
  },
];
