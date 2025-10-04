

"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { Voucher } from '../actions';
import { Button } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash2, FileText, Eye, Banknote, FileDown, BookUser, GitBranch, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteVoucher } from '../actions';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from '@/components/ui/button';
import EditVoucherDialog from './edit-voucher-dialog';
import type { VoucherListSettings, VoucherTableColumn } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';


interface VouchersTableProps {
  vouchers: Voucher[];
  onDataChanged: () => void;
  settings: VoucherListSettings;
}

const formatCurrency = (amount: number | undefined | null, currency: string) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) return '-';
    if (amount === 0) return '-';
    return `${new Intl.NumberFormat('en-US').format(Number(amount))} ${currency}`;
};

const VoucherTypeIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'journal_from_standard_receipt': return <FileDown className="h-4 w-4 text-green-600" />;
        case 'journal_from_distributed_receipt': return <GitBranch className="h-4 w-4 text-purple-600" />;
        case 'journal_from_payment': return <FileUp className="h-4 w-4 text-red-600" />;
        case 'journal_from_expense': return <Banknote className="h-4 w-4 text-orange-600" />;
        case 'journal_from_remittance': return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
        case 'journal_voucher': return <BookUser className="h-4 w-4 text-gray-600" />;
        default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
};

const VoucherRow = ({ voucher, onDataChanged, columns }: { 
    voucher: Voucher; 
    onDataChanged: () => void; 
    columns: VoucherTableColumn[];
}) => {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = React.useState(false);

    const handleDelete = async () => {
        const result = await deleteVoucher(voucher.id);
        if (result.success) {
            toast({ title: 'تم حذف السند بنجاح' });
            onDataChanged();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };
    
    const renderCell = (colId: string) => {
        switch (colId) {
            case 'invoiceNumber': return <div className="font-mono text-xs">{voucher.invoiceNumber || `#${voucher.id.slice(0, 6)}`}</div>;
            case 'date': return format(parseISO(voucher.date), 'yyyy-MM-dd');
            case 'voucherType': return <div className="flex items-center justify-end gap-2"><VoucherTypeIcon type={voucher.voucherType} /><span>{voucher.voucherTypeLabel}</span></div>;
            case 'companyName': return voucher.companyName;
            case 'boxName': return <Badge variant="outline">{voucher.boxName}</Badge>;
            case 'debit': return <span className="font-mono text-red-600">{formatCurrency(voucher.debit, voucher.currency)}</span>;
            case 'credit': return <span className="font-mono text-green-600">{formatCurrency(voucher.credit, voucher.currency)}</span>;
            case 'details': return <span className="text-muted-foreground">{voucher.details}</span>;
            case 'officer': return <span className="text-muted-foreground">{voucher.officer}</span>;
            case 'actions': return (
                <div className="flex items-center justify-center gap-1">
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted/50" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4"/>
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive">
                             <Trash2 className="h-4 w-4"/>
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                                <AlertDialogDescription>هذا الإجراء سيقوم بحذف السند بشكل دائم.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، قم بالحذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )
            default: return null;
        }
    }

    return (
        <>
        <TableRow>
            {columns.filter(c => c.visible).map(col => (
                <TableCell key={col.id} className="text-right p-2">{renderCell(col.id)}</TableCell>
            ))}
        </TableRow>
        {isEditing && (
            <EditVoucherDialog
                voucherId={voucher.id}
                onVoucherUpdated={onDataChanged}
                open={isEditing}
                onOpenChange={setIsEditing}
            />
        )}
        </>
    );
};

export default function VouchersTable({ vouchers, onDataChanged, settings }: VouchersTableProps) {
    
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table dir="rtl">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
             {(settings?.columns || []).filter(c => c.visible).map(col => (
                <TableHead key={col.id} className="font-bold text-right p-2 text-muted-foreground whitespace-nowrap">{col.label}</TableHead>
             ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {vouchers.length === 0 ? (
             <TableRow>
                <TableCell colSpan={(settings?.columns || []).filter(c => c.visible).length} className="h-24 text-center">
                     لا توجد سندات لعرضها.
                </TableCell>
             </TableRow>
          ) : vouchers.map(voucher => (
                 <VoucherRow 
                    key={voucher.id} 
                    voucher={voucher} 
                    onDataChanged={onDataChanged}
                    columns={settings.columns}
                />
              )
            )}
        </TableBody>
      </Table>
    </div>
  );
}
