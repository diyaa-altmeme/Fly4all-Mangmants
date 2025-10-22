
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { getVoucherById } from '@/app/accounts/vouchers/list/actions';
import { getBookings } from '@/app/bookings/actions';
import { getVisaBookingById } from '@/app/visas/actions';
import { getSubscriptionById } from '@/app/subscriptions/actions';
import { getMonthlyProfits } from '@/app/profit-sharing/actions';
import { getSegments } from '@/app/segments/actions';
import { getRemittances } from '@/app/accounts/remittances/actions';
import { getExchanges } from '@/app/exchanges/actions';


// Import all possible edit dialogs
import BookingDialog from '@/app/bookings/components/add-booking-dialog';
import EditVisaDialog from '@/app/visas/components/edit-visa-dialog';
import AddSubscriptionDialog from '@/app/subscriptions/components/add-subscription-dialog';
import EditSegmentPeriodDialog from '@/components/segments/edit-segment-period-dialog';
import EditManualProfitDialog from '@/app/profit-sharing/components/edit-manual-profit-dialog';
import AddRemittanceDialog from '@/app/accounts/remittances/components/add-remittance-dialog';
import EditBatchDialog from '@/app/exchanges/components/EditBatchDialog';

interface EditVoucherHandlerProps {
  voucher: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditVoucherHandler({ voucher, isOpen, onClose }: EditVoucherHandlerProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !voucher?.sourceType || !voucher?.sourceId) {
        setData(null);
        return;
      }

      setLoading(true);
      let fetchedData = null;
      try {
        switch (voucher.sourceType) {
          case 'booking': {
            const { bookings } = await getBookings({ limit: 1000 });
            fetchedData = bookings.find(b => b.id === voucher.sourceId);
            break;
          }
          case 'visa':
            fetchedData = await getVisaBookingById(voucher.sourceId);
            break;
          case 'subscription':
            fetchedData = await getSubscriptionById(voucher.sourceId);
            break;
          case 'segment': {
             const allSegments = await getSegments();
             const period = allSegments.find(s => s.id === voucher.sourceId);
             fetchedData = period;
             break;
          }
          case 'profit-sharing': {
            const allProfits = await getMonthlyProfits();
            fetchedData = allProfits.find(p => p.id === voucher.sourceId);
            break;
          }
          case 'remittance': {
            const allRemittances = await getRemittances();
            fetchedData = allRemittances.find(r => r.id === voucher.sourceId);
            break;
          }
          case 'exchange_transaction':
          case 'exchange_payment': {
              const { accounts } = await getExchanges();
              const batchData = {
                  id: voucher.sourceId,
                  ...voucher.originalData,
                  details: [voucher.originalData],
                  entryType: voucher.sourceType
              }
              fetchedData = { batch: batchData, exchanges: accounts };
              break;
          }
          default:
            router.push(`/accounts/vouchers/${voucher.id}/edit`);
            return;
        }
        setData(fetchedData);
      } catch (error) {
        console.error("Failed to fetch data for editing:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, voucher, router]);

  const handleSuccess = () => {
    onClose();
  };

  if (!isOpen || !voucher || !data || loading) {
    return null;
  }

  switch (voucher.sourceType) {
    case 'booking':
      return (
        <BookingDialog isEditing booking={data} onBookingUpdated={handleSuccess}>
          <div />
        </BookingDialog>
      );
    case 'visa':
      return (
        <EditVisaDialog booking={data} onBookingUpdated={handleSuccess} />
      );
    case 'subscription':
      return (
        <AddSubscriptionDialog isEditing initialData={data} onSubscriptionUpdated={handleSuccess}>
          <div />
        </AddSubscriptionDialog>
      );
    case 'segment':
       return <EditSegmentPeriodDialog existingPeriod={data} clients={[]} suppliers={[]} onSuccess={handleSuccess} />

    case 'profit-sharing':
        return <EditManualProfitDialog period={data} partners={[]} onSuccess={handleSuccess} />

    case 'remittance':
        return <AddRemittanceDialog isEditing initialData={data} onSaveSuccess={handleSuccess}><div /></AddRemittanceDialog>

    case 'exchange_transaction':
    case 'exchange_payment':
       return <EditBatchDialog batch={data.batch} exchanges={data.exchanges} onSuccess={handleSuccess}><div /></EditBatchDialog>

    default:
      return null;
  }
}
