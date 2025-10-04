
"use client";

import React from 'react';
import { notFound, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import NewStandardReceiptForm from '@/app/accounts/vouchers/components/new-standard-receipt-form';
import NewDistributedReceiptForm from '@/app/accounts/vouchers/components/new-distributed-receipt-form';
import NewPaymentVoucherForm from '@/app/accounts/vouchers/components/new-payment-voucher-form';
import NewExpenseVoucherForm from '@/app/accounts/vouchers/components/new-expense-voucher-form';
import NewJournalVoucherForm from '@/app/accounts/vouchers/components/new-journal-voucher-form';
import type { Box, Client, Supplier, AppSettings, Currency, User } from '@/lib/types';
import { parseISO } from 'date-fns';

interface EditVoucherFormProps {
    voucher: any;
    clients: Client[];
    suppliers: Supplier[];
    boxes: Box[];
    users: User[];
    settings: AppSettings;
}

export default function EditVoucherForm({ voucher, clients, suppliers, boxes, users, settings }: EditVoucherFormProps) {
    const router = useRouter();

    if (!voucher) {
        notFound();
    }
    
    const handleSuccess = () => {
        router.push('/accounts/vouchers/list');
        router.refresh();
    };
    
    const getInitialData = (voucher: any, voucherType: string) => {
        const baseData = {
            ...(voucher.originalData || voucher),
            id: voucher.id,
            date: parseISO(voucher.date),
        };
    
        switch (voucherType) {
            case 'standard_receipt_vouchers':
                return {
                    ...baseData,
                    from: voucher.originalData?.from,
                    toBox: voucher.originalData?.toBox,
                    amount: voucher.originalData?.amount,
                    details: voucher.originalData?.details,
                };
            case 'payment-vouchers':
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
            case 'expense-vouchers':
                 return baseData;
            case 'distributed_receipt_vouchers':
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
        const voucherType = voucher.voucherType === 'journal_from_standard_receipt' ? 'standard_receipt_vouchers'
                          : voucher.voucherType === 'journal_from_payment' ? 'payment-vouchers'
                          : voucher.voucherType === 'journal_from_expense' ? 'expense-vouchers'
                          : voucher.voucherType === 'journal_from_distributed_receipt' ? 'distributed_receipt_vouchers'
                          : 'journal-vouchers';

        switch (voucherType) {
            case 'standard_receipt_vouchers':
                return (
                    <NewStandardReceiptForm
                        isEditing
                        initialData={getInitialData(voucher, voucherType)}
                        onVoucherUpdated={handleSuccess}
                        selectedCurrency={voucher.currency as Currency}
                    />
                );
            case 'payment-vouchers':
                 return (
                    <NewPaymentVoucherForm
                        isEditing
                        initialData={getInitialData(voucher, voucherType)}
                        onVoucherUpdated={handleSuccess}
                        selectedCurrency={voucher.currency as Currency}
                    />
                );
            case 'expense-vouchers':
                 return (
                    <NewExpenseVoucherForm
                        isEditing
                        initialData={getInitialData(voucher, voucherType)}
                        onVoucherUpdated={handleSuccess}
                        boxes={boxes}
                        selectedCurrency={voucher.currency as Currency}
                    />
                );
            case 'distributed_receipt_vouchers':
                 return (
                    <NewDistributedReceiptForm
                        isEditing
                        initialData={getInitialData(voucher, voucherType)}
                        onVoucherUpdated={handleSuccess}
                        settings={settings.voucherSettings?.distributed!}
                        selectedCurrency={voucher.currency as Currency}
                    />
                );
            case 'journal-vouchers':
                return (
                    <NewJournalVoucherForm
                        isEditing
                        initialData={getInitialData(voucher, voucherType)}
                        onVoucherUpdated={handleSuccess}
                        selectedCurrency={voucher.currency as Currency}
                    />
                )
            default:
                return <p>نوع السند غير مدعوم للتعديل حاليًا: {voucher.voucherType}</p>;
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
            <CardContent>
                {renderForm()}
            </CardContent>
        </Card>
    );
}
