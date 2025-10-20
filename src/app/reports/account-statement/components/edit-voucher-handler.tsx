
"use client";

import React from 'react';
import NewStandardReceiptDialog from '@/app/accounts/vouchers/components/new-standard-receipt-dialog';
import NewPaymentVoucherDialog from '@/app/accounts/vouchers/components/new-payment-voucher-dialog';
import NewExpenseVoucherDialog from '@/components/vouchers/components/new-expense-voucher-dialog';
import NewDistributedReceiptDialog from '@/components/vouchers/components/new-distributed-receipt-dialog';
import NewJournalVoucherDialog from '@/components/vouchers/components/new-journal-voucher-dialog';
import BookingDialog from '@/app/bookings/components/add-booking-dialog';
import EditVisaDialog from '@/app/visas/components/edit-visa-dialog';
import { getVoucherById } from '@/app/accounts/vouchers/list/actions';
import { getBookingById } from '@/app/bookings/actions'; // You might need to create this
import { getVisaBookingById } from '@/app/visas/actions'; // You might need to create this

interface EditVoucherHandlerProps {
  voucherId: string;
  onVoucherUpdated: () => void;
  children: React.ReactNode;
}

const EditVoucherHandler = ({ voucherId, onVoucherUpdated, children }: EditVoucherHandlerProps) => {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpen = async () => {
    setLoading(true);
    setError(null);
    try {
      const voucher = await getVoucherById(voucherId);
      if (!voucher) {
        throw new Error("Voucher not found");
      }
      setData(voucher);
    } catch (e: any) {
      setError(e.message || "Failed to load data for editing.");
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return <div onClick={handleOpen}>{children}</div>;
  }

  const voucherType = data.voucherType;

  switch (voucherType) {
    case 'journal_from_standard_receipt':
      return (
        <NewStandardReceiptDialog onVoucherAdded={onVoucherUpdated} isEditing initialData={data.originalData}>
            {children}
        </NewStandardReceiptDialog>
      );
    case 'journal_from_payment':
      return (
        <NewPaymentVoucherDialog onVoucherAdded={onVoucherUpdated} isEditing initialData={data.originalData}>
            {children}
        </NewPaymentVoucherDialog>
      );
    case 'journal_from_expense':
         return (
             <NewExpenseVoucherDialog onVoucherAdded={onVoucherUpdated} isEditing initialData={data.originalData}>
                {children}
            </NewExpenseVoucherDialog>
         )
    case 'journal_from_distributed_receipt':
         return (
             <NewDistributedReceiptDialog onVoucherAdded={onVoucherUpdated} isEditing initialData={data.originalData}>
                {children}
            </NewDistributedReceiptDialog>
         )
    case 'journal_voucher':
         return (
             <NewJournalVoucherDialog onVoucherAdded={onVoucherUpdated} isEditing initialData={data}>
                {children}
            </NewJournalVoucherDialog>
         )
    case 'booking':
        return (
            <BookingDialog isEditing booking={data.originalData} onBookingUpdated={onVoucherUpdated}>
                {children}
            </BookingDialog>
        )
    case 'visa':
         return (
             <EditVisaDialog booking={data.originalData} onBookingUpdated={onVoucherUpdated}>
                {children}
             </EditVisaDialog>
         )
    default:
      return <div onClick={() => alert(`Editing for type "${voucherType}" is not yet implemented.`)}>{children}</div>;
  }
};

export default EditVoucherHandler;
