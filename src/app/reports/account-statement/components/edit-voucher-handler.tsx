
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
import { getBookings } from '@/app/bookings/actions'; // You might need to create this
import { getVisaBookingById } from '@/app/visas/actions'; // You might need to create this
import { getSubscriptionById } from '@/app/subscriptions/actions';
import EditSegmentPeriodDialog from '@/components/segments/edit-segment-period-dialog';
import EditManualProfitDialog from '@/app/profit-sharing/components/edit-manual-profit-dialog';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { getMonthlyProfits } from '@/app/profit-sharing/actions';
import AddSubscriptionDialog from '@/app/subscriptions/components/add-subscription-dialog';
import { parseISO } from 'date-fns';

interface EditVoucherHandlerProps {
  voucherId: string;
  onVoucherUpdated: () => void;
  children: React.ReactNode;
}

const EditVoucherHandler = ({ voucherId, onVoucherUpdated, children }: EditVoucherHandlerProps) => {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { data: navData } = useVoucherNav();

  const handleOpen = async () => {
    if (data) return; // Data already loaded
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

  if (voucherType === 'segment') {
    return (
        <EditSegmentPeriodDialog 
            existingPeriod={{
                fromDate: data.originalData.fromDate,
                toDate: data.originalData.toDate,
                entries: [data.originalData]
            }} 
            clients={navData?.clients || []} 
            suppliers={navData?.suppliers || []} 
            onSuccess={onVoucherUpdated}
        />
    )
  }
  
  if (data.originalData?.manualProfitId) {
      // Logic to fetch the full manual profit period to pass to the dialog
      // This is a simplified approach. A dedicated fetch function would be better.
      // For now, we assume we have enough data or that the component can handle it.
      return (
           <EditManualProfitDialog
            period={{...data.originalData, id: data.originalData.manualProfitId, totalProfit: data.originalData.profit }}
            partners={[...(navData?.clients || []), ...(navData?.suppliers || [])]}
            onSuccess={onVoucherUpdated}
        />
      )
  }

  switch (voucherType) {
    case 'subscription':
      return (
          <AddSubscriptionDialog
            isEditing
            initialData={{...data.originalData, purchaseDate: parseISO(data.originalData.purchaseDate), startDate: parseISO(data.originalData.startDate)}}
            onSubscriptionUpdated={onVoucherUpdated}
          >
            {children}
          </AddSubscriptionDialog>
      );
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
