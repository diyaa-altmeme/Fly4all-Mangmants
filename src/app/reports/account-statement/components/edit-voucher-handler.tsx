"use client";

import React from 'react';
import NewStandardReceiptForm from '@/app/accounts/vouchers/components/new-standard-receipt-form';
import NewPaymentVoucherForm from '@/app/accounts/vouchers/components/new-payment-voucher-form';
import NewExpenseVoucherForm from '@/app/accounts/vouchers/components/new-expense-voucher-form';
import NewDistributedReceiptDialog from '@/components/vouchers/components/new-distributed-receipt-dialog';
import NewJournalVoucherForm from '@/app/accounts/vouchers/components/new-journal-voucher-form';
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
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface EditVoucherHandlerProps {
  voucherId: string;
  sourceType?: string;
  sourceId?: string;
  sourceRoute?: string;
  onVoucherUpdated: () => void;
}

const EditVoucherHandler = ({ voucherId, sourceType, sourceId, sourceRoute, onVoucherUpdated }: EditVoucherHandlerProps) => {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (sourceRoute) {
        router.push(sourceRoute);
    } else {
        // Fallback for older data or manual entries
        router.push(`/accounts/vouchers/${voucherId}/edit`);
    }
  };

  return (
    <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600" onClick={handleClick}>
      <Pencil className="h-4 w-4" />
    </Button>
  );
};

export default EditVoucherHandler;
