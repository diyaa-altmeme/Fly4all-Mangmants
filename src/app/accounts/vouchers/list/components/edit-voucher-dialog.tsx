

"use client";

import React, from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getVoucherById } from '@/app/accounts/vouchers/list/actions';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { getBoxes } from '@/app/boxes/actions';
import { getSettings } from '@/app/settings/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2, Pencil } from 'lucide-react';
import NewStandardReceiptForm from '@/app/accounts/vouchers/components/new-standard-receipt-form';
import NewPaymentVoucherForm from '@/app/accounts/vouchers/components/new-payment-voucher-form';
import NewExpenseVoucherForm from '@/app/accounts/vouchers/components/new-expense-voucher-form';
import NewDistributedReceiptForm from '@/app/accounts/vouchers/components/new-distributed-receipt-form';
import NewJournalVoucherForm from '@/app/accounts/vouchers/components/new-journal-voucher-form';
import { parseISO } from 'date-fns';
import type { Client, Supplier, Box, AppSettings, Currency, User } from '@/lib/types';
import { getUsers } from '@/app/users/actions';


interface EditVoucherDialogProps {
  voucherId: string;
  onVoucherUpdated: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditVoucherDialog({ voucherId, onVoucherUpdated, open, onOpenChange }: EditVoucherDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<{
    voucher: any;
    clients: Client[];
    suppliers: Supplier[];
    boxes: Box[];
    users: User[];
    settings: AppSettings;
  } | null>(null);
  
  const fetchDialogData = React.useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const [voucher, clientsResponse, suppliers, boxes, users, settings] = await Promise.all([
            getVoucherById(voucherId),
            getClients({ all: true }),
            getSuppliers({ all: true }),
            getBoxes(),
            getUsers(),
            getSettings(),
        ]);
        if (!voucher) throw new Error("لم يتم العثور على السند.");
        setData({
          voucher,
          clients: clientsResponse.clients,
          suppliers,
          boxes,
          users,
          settings,
        });
      } catch (e: any) {
        setError(e.message || "فشل تحميل البيانات اللازمة للتعديل.");
      } finally {
        setLoading(false);
      }
  }, [voucherId]);

  React.useEffect(() => {
    if (open) {
      fetchDialogData();
    }
  }, [open, fetchDialogData]);

  const handleSuccess = () => {
    onVoucherUpdated();
    onOpenChange(false);
  };
  
   const getInitialData = (voucher: any, voucherType: string) => {
        const baseData = {
            ...(voucher.originalData || voucher),
            id: voucher.id,
            date: parseISO(voucher.date),
        };
    
        switch (voucherType) {
            case 'journal_from_standard_receipt':
                return {
                    ...baseData,
                    from: voucher.originalData?.from,
                    toBox: voucher.originalData?.toBox,
                    amount: voucher.originalData?.amount,
                    details: voucher.originalData?.details,
                };
            case 'journal_from_payment':
                return {
                    ...baseData,
                    payeeId: voucher.originalData?.toSupplierId,
                    fund: voucher.originalData?.boxId,
                    totalAmount: voucher.originalData?.amount,
                    purpose: voucher.originalData?.purpose,
                };
            case 'journal_voucher':
                 return {
                    ...baseData,
                    entries: [
                        ...(voucher.debitEntries || []).map((e: any) => ({ ...e, debit: e.amount, credit: 0 })),
                        ...(voucher.creditEntries || []).map((e: any) => ({ ...e, credit: e.amount, debit: 0 }))
                    ]
                 };
            case 'journal_from_expense':
                 return baseData;
            case 'journal_from_distributed_receipt':
                 return {
                    ...baseData,
                    accountId: voucher.originalData?.accountId,
                    companyAmount: voucher.originalData?.companyAmount,
                 };
            default:
                return baseData;
        }
    };


  const renderForm = () => {
    if (!data) return null;
    
    const { voucher, clients, suppliers, boxes, users, settings } = data;
    
    const payeeOptions = [
      ...clients.map(c => ({ value: c.id, label: `عميل: ${c.name}` })),
      ...suppliers.map(s => ({ value: s.id, label: `مورد: ${s.name}` })),
    ];

     const accountOptions = [
        ...payeeOptions,
        ...boxes.map(b => ({ value: b.id, label: `صندوق: ${b.name}`})),
    ];

    switch (voucher.voucherType) {
      case 'journal_from_standard_receipt':
        return (
          <NewStandardReceiptForm
            isEditing
            initialData={getInitialData(voucher, voucher.voucherType)}
            onVoucherUpdated={handleSuccess}
            selectedCurrency={voucher.currency as Currency}
          />
        );
      case 'journal_from_payment':
        return (
          <NewPaymentVoucherForm
            isEditing
            initialData={getInitialData(voucher, voucher.voucherType)}
            onVoucherUpdated={handleSuccess}
            selectedCurrency={voucher.currency as Currency}
          />
        );
      case 'journal_from_expense':
        return (
          <NewExpenseVoucherForm
            isEditing
            initialData={getInitialData(voucher, voucher.voucherType)}
            onVoucherUpdated={handleSuccess}
            boxes={boxes}
            selectedCurrency={voucher.currency as Currency}
          />
        );
      case 'journal_from_distributed_receipt':
        return (
          <NewDistributedReceiptForm
            isEditing
            initialData={getInitialData(voucher, voucher.voucherType)}
            onVoucherUpdated={handleSuccess}
            settings={settings.voucherSettings?.distributed!}
            selectedCurrency={voucher.currency as Currency}
          />
        );
      case 'journal_voucher':
        return (
          <NewJournalVoucherForm
              isEditing
              initialData={getInitialData(voucher, voucher.voucherType)}
              onVoucherUpdated={handleSuccess}
              selectedCurrency={voucher.currency as Currency}
          />
        )
      default:
        return <p>نوع السند غير مدعوم للتعديل حاليًا: {voucher.voucherType}</p>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>تعديل السند</DialogTitle>
          <DialogDescription>قم بتعديل بيانات السند. سيتم حفظ التغييرات وتحديث السجلات.</DialogDescription>
        </DialogHeader>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading && <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          {error && <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>خطأ!</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          {!loading && !error && data && renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
