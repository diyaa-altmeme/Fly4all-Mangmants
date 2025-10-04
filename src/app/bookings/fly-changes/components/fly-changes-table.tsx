
"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Edit, Trash2, Weight, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Client, Supplier } from '@/lib/types';
import { type FlyChangeOrBaggage, deleteBaggagePurchase, deleteFlyChange } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import AddChangeOrBaggageDialog from './add-change-or-baggage-dialog';

interface FlyChangesTableProps {
  data: FlyChangeOrBaggage[];
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const EditChangeOrBaggageWrapper = ({ item, clients, suppliers, onSuccess, onCancel }: { item: FlyChangeOrBaggage; clients: Client[]; suppliers: Supplier[]; onSuccess: () => void; onCancel: () => void; }) => {
    // This wrapper is needed to conditionally render the dialog and avoid context issues
    return (
        <AddChangeOrBaggageDialog 
            clients={clients} 
            suppliers={suppliers} 
            onSuccess={() => {
                onSuccess();
                onCancel();
            }}
        >
            <span />
        </AddChangeOrBaggageDialog>
    );
};


export default function FlyChangesTable({ data, clients, suppliers, onSuccess }: FlyChangesTableProps) {
    const { toast } = useToast();
    const [itemToDelete, setItemToDelete] = useState<FlyChangeOrBaggage | null>(null);
    const [itemToEdit, setItemToEdit] = useState<FlyChangeOrBaggage | null>(null);

    const handleDelete = async () => {
        if (!itemToDelete) return;

        const { id, type } = itemToDelete;
        const deleteAction = type === 'change' ? deleteFlyChange : deleteBaggagePurchase;

        const result = await deleteAction(id);
        if (result.success) {
            toast({ title: 'تم الحذف بنجاح' });
            onSuccess();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
        setItemToDelete(null);
    };

  return (
    <>
        <div className="border rounded-lg overflow-x-auto">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>النوع</TableHead>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>PNR</TableHead>
                <TableHead>الجهة المصدرة</TableHead>
                <TableHead>سعر الشراء</TableHead>
                <TableHead>الجهة المستفيدة</TableHead>
                <TableHead>سعر البيع</TableHead>
                <TableHead>تاريخ الاصدار</TableHead>
                <TableHead>ملاحظات</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {data.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">لا توجد بيانات لعرضها.</TableCell>
                </TableRow>
            ) : data.map(item => {
                const supplierName = suppliers.find(s => s.id === item.supplierId)?.name || 'غير محدد';
                const clientName = clients.find(c => c.id === item.beneficiaryId)?.name || 'غير محدد';
                
                return (
                    <TableRow key={item.id}>
                        <TableCell>
                             <Badge variant={item.type === 'change' ? 'default' : 'secondary'}>
                                {item.type === 'change' ? <RefreshCw className="me-2 h-3 w-3" /> : <Weight className="me-2 h-3 w-3" />}
                                {item.type === 'change' ? 'تغيير' : 'وزن'}
                            </Badge>
                        </TableCell>
                        <TableCell>{item.invoiceNumber || '-'}</TableCell>
                        <TableCell>{item.pnr}</TableCell>
                        <TableCell>{supplierName}</TableCell>
                        <TableCell>{formatCurrency(item.purchasePrice)}</TableCell>
                        <TableCell>{clientName}</TableCell>
                        <TableCell>{formatCurrency(item.salePrice)}</TableCell>
                        <TableCell>{item.issueDate}</TableCell>
                        <TableCell>{item.notes || '-'}</TableCell>
                        <TableCell className="text-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => setItemToEdit(item)}>
                                        <Edit className="me-2 h-4 w-4" />
                                        تعديل
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setItemToDelete(item)} className="text-red-500 focus:text-red-500"><Trash2 className="me-2 h-4 w-4"/> حذف</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                )
            })}
            </TableBody>
        </Table>
        </div>
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                    <AlertDialogDescription>
                        هذا الإجراء سيحذف السجل بشكل دائم ولا يمكن التراجع عنه.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، قم بالحذف</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        {itemToEdit && (
            <EditChangeOrBaggageWrapper
              item={itemToEdit}
              clients={clients}
              suppliers={suppliers}
              onSuccess={onSuccess}
              onCancel={() => setItemToEdit(null)}
            />
        )}
    </>
  );
}
