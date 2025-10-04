
"use client";

import * as React from 'react';
import type { Client, Company, Supplier } from '@/lib/types';
import { useReactTable, getCoreRowModel, flexRender, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, SortingState, ColumnDef } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { deleteClient, deleteCompany, deleteSupplier } from '../actions';
import ClientForm from './client-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type AllEntities = Client | Company | Supplier;

const ActionsCell = ({ row, type, onDataChanged, whatsappGroups }: { row: any, type: 'company' | 'client' | 'supplier', onDataChanged: () => void, whatsappGroups: any[] }) => {
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const original = row.original as AllEntities;

    const handleDelete = async (id: string) => {
        let deleteAction;
        if (type === 'client') deleteAction = deleteClient;
        else if (type === 'company') deleteAction = deleteCompany;
        else deleteAction = deleteSupplier;
        
        const result = await deleteAction(id);
        if (result.success) {
            toast({ title: "تم الحذف بنجاح" });
            onDataChanged();
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

    return (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                     <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                        <Edit className="me-2 h-4 w-4"/> تعديل
                    </DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 focus:text-red-600"><Trash2 className="me-2 h-4 w-4"/>حذف</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هذا الإجراء سيحذف السجل بشكل دائم ولا يمكن التراجع عنه.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(original.id)} className={buttonVariants({variant: 'destructive'})}>نعم، احذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent>
                <DialogHeader>
                     <DialogTitle>تعديل بيانات: {original.name}</DialogTitle>
                </DialogHeader>
                <ClientForm 
                    type={type === 'supplier' ? 'company' : type} // Temp fix, supplier form needs to be different
                    isEditing
                    initialData={original as Client | Company}
                    whatsappGroups={whatsappGroups}
                    onSuccess={() => { onDataChanged(); setIsEditDialogOpen(false); }}
                    onCancel={() => setIsEditDialogOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
};

// ... More code follows

