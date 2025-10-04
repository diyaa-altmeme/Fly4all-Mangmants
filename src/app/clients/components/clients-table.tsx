
      
"use client";

import * as React from 'react';
import type { Client, RelationSection, CustomRelationField, RelationType, CompanyPaymentType } from '@/lib/types';
import { useReactTable, getCoreRowModel, flexRender, getPaginationRowModel, getSortedRowModel, ColumnDef, Table as ReactTable, getFilteredRowModel, RowSelectionState, Column } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Loader2, FileText, AlertCircle, Building, User as UserIcon, Phone, Mail, CircleUserRound, Users, Store, MapPin, Briefcase, KeyRound, CheckCircle, ArrowUpDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { deleteClient, deleteMultipleClients } from '@/app/clients/actions';
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CredentialsDialog from './credentials-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';


const ActionsCell = ({ row, onDataChanged }: { 
    row: any, 
    onDataChanged: (updatedClient?: Client) => void;
}) => {
    const { toast } = useToast();
    const client = row.original as Client;
    
    const handleDelete = async (id: string) => {
        if (client.useCount && client.useCount > 0) {
            toast({
                title: "لا يمكن الحذف",
                description: "لا يمكن حذف هذه العلاقة لوجود معاملات مالية مرتبطة بها.",
                variant: "destructive",
            });
            return;
        }

        const result = await deleteClient(id);
        if (result.success) {
            toast({ title: "تم الحذف بنجاح" });
            onDataChanged();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="text-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                     <DropdownMenuItem asChild>
                        <Link href={`/clients/${client.id}`} className="justify-end w-full flex items-center gap-2"><span>عرض البروفايل</span><FileText className="h-4 w-4"/></Link>
                    </DropdownMenuItem>
                    <AddClientDialog isEditing initialData={client} onClientUpdated={onDataChanged}>
                       <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="w-full flex justify-between">
                          <span>تعديل</span><Edit className="h-4 w-4"/>
                       </DropdownMenuItem>
                    </AddClientDialog>
                     <CredentialsDialog client={client} onCredentialsUpdated={onDataChanged}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-end w-full flex items-center gap-2">
                            <span>إدارة الدخول</span><KeyRound className="h-4 w-4"/>
                        </DropdownMenuItem>
                    </CredentialsDialog>
                    <DropdownMenuItem asChild>
                         <Link href={`/reports/account-statement?accountId=${client.id}`} className="justify-end w-full flex items-center gap-2">
                           <span>كشف الحساب</span>
                           <FileText className="h-4 w-4"/>
                        </Link>
                    </DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 focus:text-red-600 justify-between w-full"><span>حذف</span><Trash2 className="h-4 w-4"/></DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هذا الإجراء سيحذف السجل بشكل دائم. لا يمكن حذف علاقة مرتبطة بحسابات مالية.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(client.id)} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، احذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};


const renderCellContent = (row: any, field: CustomRelationField) => {
    const value = row.original[field.id];
    if (value === undefined || value === null || value === '') return <div className="text-center">-</div>;

    switch (field.id) {
        case 'relationType':
            const relationLabels: Record<RelationType, string> = { client: 'عميل', supplier: 'مورد', both: 'عميل ومورد' };
            return <div className="text-center"><Badge variant="secondary">{relationLabels[value as RelationType] || value}</Badge></div>;
        case 'status':
            const statusLabels: Record<Client['status'], string> = { active: 'نشط', inactive: 'غير نشط' };
            return <div className="text-center"><Badge variant={value === 'active' ? 'default' : 'destructive'} className={cn(value === 'active' ? 'bg-green-500' : '')}>{statusLabels[value as 'active' | 'inactive'] || value}</Badge></div>;
        case 'paymentType':
            const paymentLabels: Record<CompanyPaymentType, string> = { cash: 'نقدي', credit: 'آجل' };
            return <div className="text-center"><Badge variant="outline">{paymentLabels[value as CompanyPaymentType] || value}</Badge></div>;
        case 'type':
             const typeLabels: Record<Client['type'], string> = { company: 'شركة', individual: 'فرد' };
             return <div className="text-center"><Badge variant="outline">{typeLabels[value as Client['type']] || value}</Badge></div>;
        default:
            return <div className="text-center">{value}</div>;
    }
};

export const getColumns = (
    relationSections: RelationSection[], 
    onDataChanged: () => void
): ColumnDef<Client>[] => {
    
    if (!relationSections || !Array.isArray(relationSections)) {
        return [];
    }
    
    const visibleFields = relationSections
        .flatMap(s => s.fields)
        .filter(field => field.visible && field.id !== 'name'); // Name is handled separately

    const columns: ColumnDef<Client>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            header: ({ column }) => <DataTableColumnHeader column={column} title="العلاقة" />,
            cell: ({ row }) => {
                const client = row.original;
                return (
                     <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={client.avatarUrl} alt={client.name} />
                            <AvatarFallback><CircleUserRound className="h-6 w-6 text-muted-foreground"/></AvatarFallback>
                        </Avatar>
                        <div className="text-right">
                            <div className="flex items-center gap-2">
                                 <p className="font-bold">{client.name}</p>
                                 {client.password && (
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>هذه العلاقة لديها حساب فعال لتسجيل الدخول.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                 )}
                            </div>
                            {client.code && <p className="text-xs text-muted-foreground">({client.code})</p>}
                        </div>
                    </div>
                )
            }
        },
        ...visibleFields.map(field => {
            const columnDef: ColumnDef<Client> = {
                accessorKey: field.id,
                header: ({ column }) => <DataTableColumnHeader column={column} title={field.label} />,
                cell: ({ row }) => renderCellContent(row, field),
                filterFn: (row, id, value) => value.includes(row.getValue(id)),
            };
            return columnDef;
        }),
        {
            id: 'actions',
            header: () => <div className="text-center font-bold">خيارات</div>,
            cell: ({ row }) => <ActionsCell row={row} onDataChanged={onDataChanged} />
        },
    ];

    return columns;
}

interface ClientsTableProps {
    table: ReactTable<Client>;
}

export default function ClientsTable({ table }: ClientsTableProps) {
    const { toast } = useToast();
    const router = useRouter();

    const handleDeleteSelected = async () => {
        const ids = table.getSelectedRowModel().rows.map(row => row.original.id);
        if (ids.length === 0) return;
        const result = await deleteMultipleClients(ids);
        if (result.success) {
            toast({ title: `تم حذف ${ids.length} سجلات بنجاح.` });
            table.resetRowSelection();
            router.refresh();
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
             {table.getFilteredSelectedRowModel().rows.length > 0 && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="me-2 h-4 w-4" /> حذف ({table.getFilteredSelectedRowModel().rows.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                هذا الإجراء سيقوم بحذف {table.getFilteredSelectedRowModel().rows.length} سجلات بشكل دائم ولا يمكن التراجع عنه.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected} className={cn(buttonVariants({variant: 'destructive'}))}>
                                نعم، احذف المحدد
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id} className="font-bold text-center">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
                             <TableRow 
                                key={row.id} 
                                data-state={row.getIsSelected() && "selected"}
                             >
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id} className="text-center">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={table.getAllColumns().length} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <AlertCircle className="h-10 w-10" />
                                        <h3 className="text-lg font-semibold">لا توجد نتائج</h3>
                                        <p className="text-sm">لم يتم العثور على سجلات تطابق الفلاتر المطبقة.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
