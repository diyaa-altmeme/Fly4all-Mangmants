
'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { Voucher } from '../actions';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  Banknote,
  FileDown,
  BookUser,
  GitBranch,
  ArrowRightLeft,
  FileUp,
} from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import type { VoucherListSettings } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface VouchersTableProps {
  vouchers: Voucher[];
  onDataChanged: () => void;
  settings: VoucherListSettings;
}

const formatCurrency = (amount: number | undefined | null, currency: string) => {
  if (amount === undefined || amount === null || isNaN(Number(amount)))
    return '-';
  if (amount === 0) return '-';
  const formatted = new Intl.NumberFormat('en-US').format(
    Math.abs(Number(amount))
  );
  return `${amount < 0 ? `(${formatted})` : formatted} ${currency}`;
};

const VoucherTypeIcon = ({ type }: { type: string }) => {
  const typeMap: Record<string, React.ElementType> = {
    journal_from_standard_receipt: FileDown,
    journal_from_distributed_receipt: GitBranch,
    journal_from_payment: FileUp,
    journal_from_expense: Banknote,
    journal_from_remittance: ArrowRightLeft,
    journal_voucher: BookUser,
  };
  const Icon = typeMap[type] || FileText;
  return <Icon className="h-4 w-4" />;
};

const VoucherRow = ({
  voucher,
  onDataChanged,
  columns,
}: {
  voucher: Voucher;
  onDataChanged: () => void;
  columns: any[];
}) => {
  const { toast } = useToast();

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
      case 'invoiceNumber':
        return (
          <div className="font-mono text-xs">
            {voucher.invoiceNumber || `#${voucher.id.slice(0, 6)}`}
          </div>
        );
      case 'date':
        return format(parseISO(voucher.date), 'yyyy-MM-dd');
      case 'voucherType':
        return (
          <div className="flex items-center justify-end gap-2">
            <VoucherTypeIcon type={voucher.voucherType} />
            <span>{voucher.voucherTypeLabel}</span>
          </div>
        );
      case 'companyName':
        return voucher.companyName;
      case 'boxName':
        return voucher.boxName && voucher.boxName !== 'N/A' ? (
          <Badge variant="outline">{voucher.boxName}</Badge>
        ) : (
          '-'
        );
      case 'totalAmount':
        return (
          <span className="font-mono font-bold">
            {formatCurrency(voucher.totalAmount, voucher.currency)}
          </span>
        );
      case 'notes':
        return <span className="text-muted-foreground text-xs">{voucher.notes}</span>;
      case 'officer':
        return <span className="text-muted-foreground">{voucher.officer}</span>;
      case 'actions':
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-muted/50"
            >
              <Link href={`/accounts/vouchers/${voucher.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    هذا الإجراء سيقوم بحذف السند بشكل دائم.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className={cn(buttonVariants({ variant: 'destructive' }))}
                  >
                    نعم، قم بالحذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      default:
        const originalValue = voucher.originalData?.[colId];
        if (originalValue !== undefined) return String(originalValue);
        return null;
    }
  };

  return (
    <TableRow>
      {columns
        .filter((c) => c.visible)
        .map((col) => (
          <TableCell key={col.id} className="text-right p-2">
            {renderCell(col.id)}
          </TableCell>
        ))}
    </TableRow>
  );
};

export default function VouchersTable({
  vouchers,
  onDataChanged,
  settings,
}: VouchersTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table dir="rtl">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {(settings?.columns || [])
              .filter((c) => c.visible)
              .map((col) => (
                <TableHead
                  key={col.id}
                  className="font-bold text-right p-2 text-muted-foreground whitespace-nowrap"
                >
                  {col.label}
                </TableHead>
              ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {vouchers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={(settings?.columns || []).filter((c) => c.visible).length}
                className="h-24 text-center"
              >
                لا توجد سندات لعرضها.
              </TableCell>
            </TableRow>
          ) : (
            vouchers.map((voucher) => (
              <VoucherRow
                key={voucher.id}
                voucher={voucher}
                onDataChanged={onDataChanged}
                columns={settings.columns}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
