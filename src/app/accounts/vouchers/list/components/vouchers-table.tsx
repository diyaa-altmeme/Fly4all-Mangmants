
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
  Repeat,
  Layers3,
  Share2,
  RefreshCw,
  XCircle,
  ChevronsRightLeft,
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
import { normalizeVoucherType } from '@/lib/accounting/voucher-types';
import type { NormalizedVoucherType } from '@/lib/accounting/voucher-types';

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

const VoucherTypeIcon = ({ type }: { type?: string }) => {
  const normalized = normalizeVoucherType(type) as NormalizedVoucherType;
  const typeMap: Record<NormalizedVoucherType | 'other', React.ElementType> = {
    standard_receipt: FileDown,
    distributed_receipt: GitBranch,
    payment: FileUp,
    manualExpense: Banknote,
    journal_voucher: BookUser,
    remittance: ArrowRightLeft,
    transfer: Repeat,
    booking: FileText,
    visa: FileText,
    subscription: FileText,
    segment: Layers3,
    'profit-sharing': Share2,
    refund: RefreshCw,
    exchange: RefreshCw,
    void: XCircle,
    exchange_transaction: ChevronsRightLeft,
    exchange_payment: ChevronsRightLeft,
    exchange_adjustment: ChevronsRightLeft,
    exchange_revenue: ChevronsRightLeft,
    exchange_expense: ChevronsRightLeft,
    other: FileText,
  };
  const Icon = typeMap[normalized] || FileText;
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
      case 'voucherTypeLabel':
        return (
          <div className="flex items-center justify-end gap-2">
            <VoucherTypeIcon type={voucher.normalizedType || voucher.voucherType} />
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
      case 'status':
        return (
            <Badge variant={voucher.isDeleted ? "destructive" : "default"} className={cn(voucher.isDeleted ? "" : "bg-green-500")}>
                {voucher.isDeleted ? 'محذوف' : 'فعال'}
            </Badge>
        )
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
    const columnsWithStatus = React.useMemo(() => {
        const hasStatus = settings?.columns.some(c => c.id === 'status');
        if (hasStatus) return settings.columns;
        // Add status column right after voucherTypeLabel or at a reasonable position
        const typeIndex = settings.columns.findIndex(c => c.id === 'voucherTypeLabel');
        const newColumns = [...settings.columns];
        newColumns.splice(typeIndex + 1, 0, { id: 'status', label: 'الحالة', visible: true, order: (typeIndex + 1.5) });
        return newColumns;
    }, [settings.columns]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table dir="rtl">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {(columnsWithStatus || [])
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
                colSpan={(columnsWithStatus || []).filter((c) => c.visible).length}
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
                columns={columnsWithStatus}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
