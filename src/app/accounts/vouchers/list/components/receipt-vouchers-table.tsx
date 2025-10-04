
"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  getSortedRowModel,
  ColumnOrderState,
} from '@tanstack/react-table';
import type { ReceiptVoucher, VoucherTableColumn, Client, Supplier, Box, User, AppSettings, VoucherListSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash2, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { defaultVoucherListSettings } from '@/lib/types';
import EditVoucherDialog from './edit-voucher-dialog';

const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '-';
    return new Intl.NumberFormat('en-US').format(amount);
};

interface ReceiptVouchersTableProps {
  vouchers: any[];
  clients: Client[];
  suppliers: Supplier[];
  boxes: Box[];
  users: User[];
  settings: VoucherListSettings;
  onDataChanged: () => void;
}

export default function ReceiptVouchersTable({
  vouchers,
  clients,
  suppliers,
  boxes,
  users,
  settings,
  onDataChanged
}: ReceiptVouchersTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [editingVoucherId, setEditingVoucherId] = React.useState<string | null>(null);

  
  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach(c => map.set(c.id, c.name));
    suppliers.forEach(s => map.set(s.id, s.name));
    boxes.forEach(b => map.set(b.id, b.name));
    return map;
  }, [clients, suppliers, boxes]);
  
  const usersMap = useMemo(() => new Map(users.map(u => [u.uid, u.name])), [users]);

  const columns: ColumnDef<any>[] = useMemo(() => {
    const activeColumns = settings?.columns?.filter(c => c.visible) || defaultVoucherListSettings.columns;
    
    return activeColumns.map(colConfig => {
        const baseColumn: Partial<ColumnDef<any>> = {
            id: colConfig.id,
            header: () => <div className="text-right font-bold">{colConfig.label}</div>,
            cell: ({ row }) => <div className="text-right">{row.original[colConfig.id]}</div>,
        };

        switch(colConfig.id) {
            case 'actions': return { ...baseColumn, cell: ({ row }) => {
                const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
                return (
                    <div className="flex items-center justify-center gap-1">
                         <EditVoucherDialog
                            voucherId={row.original.id}
                            open={isEditDialogOpen}
                            onOpenChange={setIsEditDialogOpen}
                            onVoucherUpdated={() => {
                                setIsEditDialogOpen(false);
                                onDataChanged();
                            }}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setIsEditDialogOpen(true)}>
                            <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </div>
                )}
            };
            case 'officer': return { ...baseColumn, accessorKey: 'officer', cell: ({ row }) => <div className="text-right">{usersMap.get(row.original.createdBy) || row.original.officer}</div> };
            case 'boxName': return { ...baseColumn, accessorKey: 'boxName', cell: ({ row }) => <div className="text-right">{accountsMap.get(row.original.boxId) || row.original.boxId}</div> };
            case 'date': return { ...baseColumn, accessorKey: 'date', cell: ({ row }) => <div className="text-right">{format(new Date(row.original.date), 'yyyy-MM-dd')}</div> };
            case 'details': return { ...baseColumn, accessorKey: 'details', cell: ({ row }) => <span className="text-xs">{row.original.details}</span> };
            case 'exchangeRate': return { ...baseColumn, accessorKey: 'exchangeRate', cell: ({ row }) => <div className="text-center">{row.original.exchangeRate ? <Badge variant="outline">{row.original.exchangeRate.toLocaleString()}</Badge> : '-'}</div> };
            case 'totalAmount': return { ...baseColumn, accessorFn: row => row.originalData?.totalAmount, cell: ({ row }) => <span className="font-mono font-bold">{formatCurrency(row.original.originalData?.totalAmount)}</span> };
            case 'currency': return { ...baseColumn, accessorKey: 'currency', cell: ({row}) => <div className="text-center">{row.original.currency}</div> };
            case 'companyName': return { ...baseColumn, accessorKey: 'companyName', cell: ({ row }) => <div className="text-right">{accountsMap.get(row.original.originalData?.accountId) || row.original.companyName}</div> };
            case 'invoiceNumber': return { ...baseColumn, accessorKey: 'invoiceNumber', cell: ({row}) => <div className="text-right">{row.original.invoiceNumber}</div> };
            case 'companyAmount': return { ...baseColumn, accessorFn: row => row.originalData?.companyAmount, cell: ({ row }) => <div className="text-right font-mono">{formatCurrency(row.original.originalData?.companyAmount)}</div> };
            default:
                if (colConfig.id.startsWith('dist_')) {
                    const fieldId = colConfig.id.replace('dist_','');
                    return {
                        ...baseColumn,
                        accessorFn: row => row.original.originalData?.distributions?.[fieldId]?.amount,
                        cell: ({ row }) => {
                            const amount = row.original.originalData?.distributions?.[fieldId]?.amount;
                            return <div className="text-right font-mono">{amount ? formatCurrency(amount) : '-'}</div>;
                        }
                    };
                }
                 // Default case for any custom fields from settings that might not be hardcoded here
                return {...baseColumn, accessorKey: colConfig.id};
        }
    });

  }, [settings, accountsMap, usersMap, onDataChanged]);


  const table = useReactTable({
    data: vouchers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="border rounded-lg overflow-x-auto">
    <Table dir="rtl">
        <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => {
                return (
                <TableHead key={header.id} colSpan={header.colSpan}>
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
        {table.getRowModel().rows.length === 0 ? (
            <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
                لا توجد سندات لعرضها.
            </TableCell>
            </TableRow>
        ) : (
            table.getRowModel().rows.map(row => (
            <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className="p-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
                ))}
            </TableRow>
            ))
        )}
        </TableBody>
    </Table>
    </div>
  );
}
