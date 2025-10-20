
'use client';

import React from 'react';
import { notFound, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import NewStandardReceiptForm from '@/app/accounts/vouchers/components/new-standard-receipt-form';
import NewPaymentVoucherForm from '@/app/accounts/vouchers/components/new-payment-voucher-form';
import NewExpenseVoucherForm from '@/app/accounts/vouchers/components/new-expense-voucher-form';
import NewJournalVoucherForm from '@/app/accounts/vouchers/components/new-journal-voucher-form';
import type {
  Box,
  Client,
  Supplier,
  AppSettings,
  Currency,
  User,
} from '@/lib/types';
import { parseISO } from 'date-fns';

interface EditVoucherFormProps {
  voucher: any;
  clients: Client[];
  suppliers: Supplier[];
  boxes: Box[];
  users: User[];
  settings: AppSettings;
}

export default function EditVoucherForm({
  voucher,
  clients,
  suppliers,
  boxes,
  users,
  settings,
}: EditVoucherFormProps) {
  const router = useRouter();

  if (!voucher) {
    notFound();
  }

  const handleSuccess = () => {
    router.push('/accounts/vouchers/list');
    router.refresh();
  };

  const getInitialData = (voucher: any) => {
    const baseData = {
      ...(voucher.originalData || voucher),
      id: voucher.id,
      // Ensure date is a Date object for form components
      date: voucher.date ? parseISO(voucher.date) : new Date(),
    };
    
    // Add specific transformations if needed, for example for journal entries
    if (voucher.voucherType === 'journal_voucher') {
      return {
        ...baseData,
        entries: [
            ...(voucher.debitEntries || []).map((e: any) => ({ ...e, debit: e.amount, credit: 0 })),
            ...(voucher.creditEntries || []).map((e: any) => ({ ...e, credit: e.amount, debit: 0 }))
        ]
      }
    }

    return baseData;
  };

  const renderForm = () => {
    const initialData = getInitialData(voucher);

    switch (voucher.voucherType) {
      case 'journal_from_standard_receipt':
        return (
          <NewStandardReceiptForm
            isEditing
            initialData={initialData}
            onVoucherUpdated={handleSuccess}
            selectedCurrency={voucher.currency as Currency}
          />
        );
      case 'journal_from_payment':
        return (
          <NewPaymentVoucherForm
            isEditing
            initialData={initialData}
            onVoucherUpdated={handleSuccess}
            selectedCurrency={voucher.currency as Currency}
          />
        );
      case 'journal_from_expense':
        return (
          <NewExpenseVoucherForm
            isEditing
            initialData={initialData}
            onVoucherUpdated={handleSuccess}
            boxes={boxes}
            selectedCurrency={voucher.currency as Currency}
          />
        );
      case 'journal_voucher':
        return (
          <NewJournalVoucherForm
            isEditing
            initialData={initialData}
            onVoucherUpdated={handleSuccess}
            selectedCurrency={voucher.currency as Currency}
          />
        );
      default:
        return (
          <p>نوع السند غير مدعوم للتعديل حاليًا: {voucher.voucherType}</p>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>تعديل السند: {voucher.invoiceNumber || voucher.id}</CardTitle>
        <CardDescription>
          قم بتعديل بيانات السند. سيتم حفظ التغييرات وتحديث السجلات.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderForm()}</CardContent>
    </Card>
  );
}
