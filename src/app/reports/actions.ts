

'use server';

import { getDb } from '@/lib/firebase-admin';
import { Timestamp } from "firebase-admin/firestore";
import type { JournalVoucher, DebtsReportData, DebtsReportEntry, Client, JournalEntry, ReportTransaction, BookingEntry, VisaBookingEntry, Subscription, ReportInfo, Currency, StructuredDescription } from '@/lib/types';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { getUsers } from "../users/actions";
import { getBoxes } from '@/app/boxes/actions';
import { getSettings } from '@/app/settings/actions';
import { getExchanges } from '@/app/exchanges/actions';
import { normalizeVoucherType, type NormalizedVoucherType } from "@/lib/accounting/voucher-types";
import * as admin from 'firebase-admin';

const normalizeToDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    const date = (value as any).toDate();
    return date instanceof Date ? date : null;
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as any).seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }
  return null;
};

const serializeDate = (value: unknown): string => {
  const asDate = normalizeToDate(value);
  return (asDate ?? new Date()).toISOString();
};

type AccountStatementFilters = {
  accountId: string;
  dateFrom?: Date;
  dateTo?: Date;
  voucherType?: string[];
  accountType?: 'relation' | 'box' | 'exchange' | 'static' | 'expense';
  relationKind?: 'client' | 'supplier' | 'partner' | 'other';
  includeDeleted?: boolean;
};

const STATIC_ACCOUNT_LABELS: Record<string, string> = {
  revenue_segments: 'إيرادات السكمنت',
  revenue_profit_distribution: 'إيراد توزيع الأرباح',
  revenue_tickets: 'إيرادات التذاكر',
  revenue_visa: 'إيرادات الفيزا',
  expense_tickets: 'تكلفة التذاكر',
  expense_visa: 'تكلفة الفيزا',
  expense_subscriptions: 'تكلفة الاشتراكات',
  expense_partners: 'مصروفات الشركاء',
};

export async function getAccountStatement(filters: AccountStatementFilters) {
  const db = await getDb();
  if (!db) {
      console.error("Database not available");
      throw new Error("Database connection is not available.");
  }
  const { accountId, dateFrom, dateTo, voucherType, accountType, relationKind, includeDeleted } = filters;

  try {
    const [
      users,
      clientsResult,
      suppliersResult,
      boxes,
      settings,
      exchangesResult,
    ] = await Promise.all([
      getUsers(),
      getClients({ all: true, includeInactive: true, relationType: 'all' }),
      getSuppliers({ all: true }),
      getBoxes(),
      getSettings(),
      getExchanges(),
    ]);
    const usersMap = new Map(users.map(u => [u.uid, u.name]));

    const clientsData = clientsResult.clients || [];
    const suppliersData = suppliersResult || [];
    const exchanges = exchangesResult?.accounts || [];
    const accountLabelMap = new Map<string, string>();
    clientsData.forEach((client) => {
      accountLabelMap.set(client.id, client.name);
    });
    suppliersData.forEach((supplier) => {
      accountLabelMap.set(supplier.id, supplier.name);
    });
    (boxes || []).forEach((box) => {
      accountLabelMap.set(box.id, box.name);
    });
    exchanges.forEach((exchange) => {
      accountLabelMap.set(exchange.id, exchange.name);
    });

    Object.entries(STATIC_ACCOUNT_LABELS).forEach(([id, label]) => {
      if (!accountLabelMap.has(id)) {
        accountLabelMap.set(id, label);
      }
    });

    const expenseAccounts = (settings as any)?.voucherSettings?.expenseAccounts || [];
    expenseAccounts.forEach((account: any) => {
      if (!account?.id || !account?.name) return;
      accountLabelMap.set(`expense_${account.id}`, account.name);
    });

    const distributionSettings = (settings as any)?.voucherSettings?.distributed;
    const distributionChannels = (distributionSettings?.distributionChannels || []) as Array<{
      id: string;
      label: string;
      accountId?: string;
    }>;
    const distributionChannelLabel = new Map<string, string>();
    distributionChannels.forEach((channel) => {
      distributionChannelLabel.set(channel.id, channel.label);
      if (channel.accountId) {
        accountLabelMap.set(channel.accountId, channel.label);
      }
    });

    const allVouchersSnap = await db.collection('journal-vouchers').orderBy('date', 'asc').get();

    const openingBalances: Record<string, number> = {};
    const reportRows: any[] = [];

    const resolvedRelationKind = relationKind
      || (clientsData.some(client => client.id === accountId)
        ? 'client'
        : suppliersData.some(supplier => supplier.id === accountId)
          ? 'supplier'
          : undefined);

    const resolvedAccountType = accountType
      || ((boxes || []).some(box => box.id === accountId) ? 'box'
        : exchanges.some(exchange => exchange.id === accountId) ? 'exchange'
          : resolvedRelationKind ? 'relation'
            : accountId?.startsWith('expense_') ? 'expense'
              : undefined);

    const getAccountLabel = (id?: string | null): string | undefined => {
      if (!id) return undefined;
      return accountLabelMap.get(id) || STATIC_ACCOUNT_LABELS[id] || id;
    };

    const docCache = new Map<string, any>();
    const fetchDoc = async (collection: string, id?: string | null) => {
      if (!id) return null;
      const cacheKey = `${collection}:${id}`;
      if (docCache.has(cacheKey)) {
        return docCache.get(cacheKey);
      }
      const snapshot = await db.collection(collection).doc(id).get();
      const data = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
      docCache.set(cacheKey, data);
      return data;
    };

    const formatDateLabel = (value: unknown): string | undefined => {
      const asDate = normalizeToDate(value);
      if (!asDate) return undefined;
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(asDate);
    };

    const formatAmountWithCurrency = (
      value: number | null | undefined,
      currency?: string | null,
    ): string | undefined => {
      if (value === null || value === undefined) return undefined;
      const code = currency || 'USD';
      const digits =
        code === 'IQD'
          ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
          : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
      const formatted = new Intl.NumberFormat('en-US', digits).format(Number(value) || 0);
      return `${formatted} ${code}`.trim();
    };

    type VoucherContext = {
      description?: string | StructuredDescription;
      notes?: string;
      parties?: string[];
    };

    const resolveVoucherContext = async ({
      normalizedType,
      rawSourceType,
      sourceId,
      voucherId,
      meta,
      voucherCurrency,
    }: {
      normalizedType?: NormalizedVoucherType;
      rawSourceType?: string;
      sourceId?: string | null;
      voucherId: string;
      meta: Record<string, any>;
      voucherCurrency: string;
    }): Promise<VoucherContext | null> => {
      if (!normalizedType) return null;
      const safeMeta = meta || {};
      const typeKey = normalizedType as string;

      if (['booking', 'refund', 'exchange', 'void'].includes(typeKey)) {
        const bookingId = safeMeta.bookingId || sourceId;
        const booking = await fetchDoc('bookings', bookingId);
        if (!booking) return null;
        const passengers = Array.isArray(booking.passengers)
          ? booking.passengers.map((p: any) => p?.name).filter(Boolean)
          : [];
        const passengerPreview = passengers.slice(0, 3).join('، ');
        const passengerSuffix = passengers.length > 3 ? '…' : '';
        const travelDate = formatDateLabel(booking.travelDate || booking.issueDate);
        const descriptionParts = [
          `حجز ${booking.pnr || booking.invoiceNumber || voucherId}`,
          passengerPreview ? `(${passengerPreview}${passengerSuffix})` : null,
          travelDate ? `- ${travelDate}` : null,
        ].filter(Boolean);
        const parties = [
          booking.clientId ? getAccountLabel(booking.clientId) : booking.clientName,
          booking.supplierId ? getAccountLabel(booking.supplierId) : booking.supplierName,
        ].filter(Boolean) as string[];
        const notesParts = [booking.route, booking.notes, safeMeta.notes].filter(Boolean);
        return {
          description: descriptionParts.join(' '),
          notes: notesParts.join(' • ') || undefined,
          parties,
        };
      }

      if (typeKey === 'visa') {
        const visaId = safeMeta.visaId || sourceId;
        const visa = await fetchDoc('visaBookings', visaId);
        if (!visa) return null;
        const passengers = Array.isArray(visa.passengers)
          ? visa.passengers.map((p: any) => p?.name).filter(Boolean)
          : [];
        const passengerPreview = passengers.slice(0, 3).join('، ');
        const passengerSuffix = passengers.length > 3 ? '…' : '';
        const submissionDate = formatDateLabel(visa.submissionDate);
        const descriptionParts = [
          `طلب فيزا ${visa.invoiceNumber || visaId}`,
          passengerPreview ? `(${passengerPreview}${passengerSuffix})` : null,
          submissionDate ? `- ${submissionDate}` : null,
        ].filter(Boolean);
        const parties = [
          visa.clientId ? getAccountLabel(visa.clientId) : visa.clientName,
          visa.supplierId ? getAccountLabel(visa.supplierId) : visa.supplierName,
        ].filter(Boolean) as string[];
        const notesParts = [visa.notes, safeMeta.notes].filter(Boolean);
        return {
          description: descriptionParts.join(' '),
          notes: notesParts.join(' • ') || undefined,
          parties,
        };
      }

      if (typeKey === 'subscription') {
        const subscriptionId = safeMeta.subscriptionId || safeMeta.subscription?.id || sourceId;
        const subscription = subscriptionId ? await fetchDoc('subscriptions', subscriptionId) : null;
        const rawSource = rawSourceType || '';
        const installmentId =
          safeMeta.installmentId ||
          safeMeta.installment?.id ||
          (rawSource.includes('installment') ? sourceId : undefined);
        const installment = installmentId
          ? await fetchDoc('subscription_installments', installmentId)
          : null;
        const currency =
          subscription?.currency || installment?.currency || safeMeta.currency || voucherCurrency;
        const parties = [
          subscription?.clientId ? getAccountLabel(subscription.clientId) : subscription?.clientName,
          subscription?.supplierId
            ? getAccountLabel(subscription.supplierId)
            : subscription?.supplierName,
        ].filter(Boolean) as string[];
        const baseNotes = [
          subscription?.invoiceNumber ? `فاتورة ${subscription.invoiceNumber}` : null,
          subscription?.startDate ? `بداية الخدمة: ${formatDateLabel(subscription.startDate)}` : null,
          subscription?.endDate ? `نهاية الخدمة: ${formatDateLabel(subscription.endDate)}` : null,
          subscription?.status ? `الحالة: ${subscription.status}` : null,
        ].filter(Boolean) as string[];

        if (installment) {
          const dueLabel = formatDateLabel(installment.dueDate);
          const installmentAmount = formatAmountWithCurrency(installment.amount, currency);
          const notesParts = [
            installmentAmount ? `مبلغ القسط: ${installmentAmount}` : null,
            installment.status ? `حالة القسط: ${installment.status}` : null,
            ...baseNotes,
            subscription?.notes,
            safeMeta.notes,
          ].filter(Boolean);
          return {
            description: `سداد قسط اشتراك ${
              subscription?.serviceName || safeMeta.serviceName || subscriptionId || voucherId
            }${dueLabel ? ` مستحق ${dueLabel}` : ''}`,
            notes: notesParts.join(' • ') || undefined,
            parties,
          };
        }

        if (rawSource.includes('overpayment')) {
          const notesParts = [...baseNotes, subscription?.notes, safeMeta.notes].filter(Boolean);
          return {
            description: `رصيد إضافي لاشتراك ${
              subscription?.serviceName || safeMeta.serviceName || subscriptionId || voucherId
            }`,
            notes: notesParts.join(' • ') || undefined,
            parties,
          };
        }

        if (rawSource.includes('reversal')) {
          const notesParts = [...baseNotes, subscription?.notes, safeMeta.notes].filter(Boolean);
          return {
            description: `عكس دفعة اشتراك ${
              subscription?.serviceName || safeMeta.serviceName || subscriptionId || voucherId
            }`,
            notes: notesParts.join(' • ') || undefined,
            parties,
          };
        }

        if (rawSource.includes('adjustment')) {
          const notesParts = [...baseNotes, subscription?.notes, safeMeta.notes].filter(Boolean);
          return {
            description: `تعديل دفعة اشتراك ${
              subscription?.serviceName || safeMeta.serviceName || subscriptionId || voucherId
            }`,
            notes: notesParts.join(' • ') || undefined,
            parties,
          };
        }

        if (rawSource.includes('cost')) {
          const notesParts = [...baseNotes, subscription?.notes, safeMeta.notes].filter(Boolean);
          return {
            description: `تكلفة اشتراك ${
              subscription?.serviceName || safeMeta.serviceName || subscriptionId || voucherId
            }`,
            notes: notesParts.join(' • ') || undefined,
            parties,
          };
        }

        const saleAmount = formatAmountWithCurrency(subscription?.salePrice ?? safeMeta.salePrice, currency);
        const costAmount = formatAmountWithCurrency(
          subscription?.purchasePrice ?? safeMeta.purchasePrice,
          currency,
        );
        const profitAmount = formatAmountWithCurrency(
          subscription?.profit ??
            (Number(subscription?.salePrice ?? 0) - Number(subscription?.purchasePrice ?? 0)),
          currency,
        );
        const paidAmount = formatAmountWithCurrency(subscription?.paidAmount ?? safeMeta.paidAmount, currency);
        const structured: StructuredDescription = {
          title: `اشتراك ${subscription?.serviceName || safeMeta.serviceName || subscriptionId || voucherId}`,
          totalReceived: saleAmount ? `قيمة الاشتراك: ${saleAmount}` : null,
          selfReceipt: profitAmount ? `الربح: ${profitAmount}` : null,
          distributions: [
            costAmount ? { name: 'التكلفة', amount: costAmount } : null,
            paidAmount ? { name: 'المسدد', amount: paidAmount } : null,
          ].filter(Boolean) as { name: string; amount: string }[],
          notes: [...baseNotes, subscription?.notes, safeMeta.notes].filter(Boolean).join(' • ') || undefined,
        };
        return {
          description: structured,
          parties,
        };
      }

      if (typeKey === 'segment') {
        const segmentId = safeMeta.segmentId || sourceId;
        const segment = segmentId ? await fetchDoc('segments', segmentId) : null;
        if (!segment) return null;
        const currency = segment.currency || voucherCurrency;
        const parties = [
          segment.clientId ? getAccountLabel(segment.clientId) : segment.companyName,
          segment.partnerName || (segment.partnerId ? getAccountLabel(segment.partnerId) : null),
        ].filter(Boolean) as string[];
        const total = formatAmountWithCurrency(segment.total, currency);
        const companyShare = formatAmountWithCurrency(segment.alrawdatainShare, currency);
        const partnerShare = formatAmountWithCurrency(segment.partnerShare, currency);
        const ticketProfits = formatAmountWithCurrency(segment.ticketProfits, currency);
        const otherProfits = formatAmountWithCurrency(segment.otherProfits, currency);
        const fromLabel = formatDateLabel(segment.fromDate);
        const toLabel = formatDateLabel(segment.toDate);
        const period = [fromLabel, toLabel].filter(Boolean).join(' حتى ');
        const structured: StructuredDescription = {
          title: `سكمنت ${segment.companyName}`,
          totalReceived: total ? `الإجمالي: ${total}` : null,
          selfReceipt: companyShare ? `حصة الشركة: ${companyShare}` : null,
          distributions: [
            partnerShare ? { name: 'حصة الشركاء', amount: partnerShare } : null,
            ticketProfits ? { name: 'أرباح التذاكر', amount: ticketProfits } : null,
            otherProfits ? { name: 'أرباح أخرى', amount: otherProfits } : null,
          ].filter(Boolean) as { name: string; amount: string }[],
          notes: period ? `الفترة: ${period}` : undefined,
        };
        return {
          description: structured,
          parties,
        };
      }

      if (typeKey === 'profit-sharing') {
        const manualId = safeMeta.manualProfitId || sourceId;
        if (manualId) {
          const manual = await fetchDoc('manual_monthly_profits', manualId);
          if (manual) {
            const currency = manual.currency || voucherCurrency;
            const total = formatAmountWithCurrency(manual.profit ?? manual.totalProfit, currency);
            const partners = Array.isArray(manual.partners) ? manual.partners : [];
            const distributions = partners
              .map((p: any) => {
                const partnerName =
                  p.partnerName || (p.partnerId ? getAccountLabel(p.partnerId) : undefined);
                const amount = formatAmountWithCurrency(p.amount ?? p.share, currency);
                if (!partnerName || !amount) return null;
                return { name: partnerName, amount };
              })
              .filter(Boolean) as { name: string; amount: string }[];
            const parties = distributions.map((d) => d.name);
            const fromLabel = formatDateLabel(manual.fromDate);
            const toLabel = formatDateLabel(manual.toDate);
            const period = [fromLabel, toLabel].filter(Boolean).join(' حتى ');
            const structured: StructuredDescription = {
              title: period ? `توزيع أرباح ${period}` : 'توزيع أرباح',
              totalReceived: total ? `الإجمالي: ${total}` : null,
              distributions: distributions.length ? distributions : undefined,
              notes: manual.notes || undefined,
            };
            return {
              description: structured,
              parties,
            };
          }
        }
        if (sourceId) {
          const share = await fetchDoc('profit_shares', sourceId);
          if (share) {
            const currency = share.currency || safeMeta.currency || voucherCurrency;
            const amount = formatAmountWithCurrency(share.amount, currency);
            const party =
              share.partnerName || (share.partnerId ? getAccountLabel(share.partnerId) : undefined);
            const notesParts = [amount ? `القيمة: ${amount}` : null, share.notes, safeMeta.notes].filter(Boolean);
            return {
              description: `حصة ${party || 'الشريك'} من أرباح ${share.profitMonthId || manualId || ''}`.trim(),
              notes: notesParts.join(' • ') || undefined,
              parties: party ? [party] : [],
            };
          }
        }
      }
      return null;
    };
    
    const resolveSourceRoute = (
      type: NormalizedVoucherType | string | undefined,
      sourceId?: string | null,
      voucherId?: string,
      meta?: Record<string, any>,
      rawSourceType?: string,
    ): string | undefined => {
      if (!sourceId && !voucherId) return undefined;
      const fallbackVoucherId = voucherId || sourceId || '';
      switch (type) {
        case 'booking':
        case 'exchange':
        case 'exchange_transaction':
        case 'exchange_payment':
        case 'exchange_adjustment':
        case 'exchange_revenue':
        case 'exchange_expense':
        case 'refund':
        case 'void':
          return sourceId ? `/bookings/${sourceId}` : `/accounts/vouchers/${fallbackVoucherId}/edit`;
        case 'visa':
          return sourceId ? `/visas/${sourceId}` : `/accounts/vouchers/${fallbackVoucherId}/edit`;
        case 'subscription': {
          const subscriptionId = meta?.subscriptionId || meta?.subscription?.id || sourceId;
          if ((rawSourceType || '').includes('installment')) {
            const installmentId = meta?.installmentId || sourceId || voucherId;
            return installmentId ? `/subscriptions?installment=${installmentId}` : '/subscriptions';
          }
          return subscriptionId ? `/subscriptions/${subscriptionId}` : '/subscriptions';
        }
        case 'segment': {
          const periodId = meta?.periodId || meta?.segmentPeriodId;
          if (periodId) {
            return `/segments?period=${periodId}`;
          }
          return sourceId ? `/segments/${sourceId}` : '/segments';
        }
        case 'profit-sharing': {
          const monthId = meta?.manualProfitId || meta?.profitMonthId || sourceId;
          return monthId ? `/profit-sharing?month=${monthId}` : '/profit-sharing';
        }
        default:
          return `/accounts/vouchers/${fallbackVoucherId}/edit`;
      }
    };

    for (const doc of allVouchersSnap.docs) {
      const v = doc.data() as JournalVoucher;
      const voucherMeta = (v as any)?.meta || (v.originalData?.meta ?? {});
      const normalizedMeta =
        typeof voucherMeta === 'object' && voucherMeta !== null
          ? (voucherMeta as Record<string, any>)
          : {};

      const isSoftDeleted = Boolean(
        v.isDeleted ||
          v.deletedAt ||
          normalizedMeta?.isDeleted ||
          normalizedMeta?.status === 'deleted' ||
          normalizedMeta?.deletedAt ||
          v.originalData?.isDeleted ||
          v.originalData?.meta?.isDeleted,
      );

      if (!includeDeleted && isSoftDeleted) {
        continue;
      }

      const voucherDate = normalizeToDate(v.date) ?? normalizeToDate(v.createdAt) ?? new Date();

      const rawSourceType = v.originalData?.sourceType || v.sourceType || v.voucherType;
      const normalizedType = normalizeVoucherType(rawSourceType || v.voucherType);

      const effectiveSourceId =
        v.originalData?.sourceId || v.sourceId || normalizedMeta?.sourceId || doc.id;
      const invoiceNumber =
        v.invoiceNumber || normalizedMeta?.invoiceNumber || normalizedMeta?.reference || doc.id;
      const officerName =
        normalizedMeta?.officerName || usersMap.get(v.createdBy) || v.officer || v.createdBy;
      const baseNotes = normalizedMeta?.description || normalizedMeta?.notes || v.notes || '';
      const voucherCurrency = v.currency || 'USD';

      const voucherContext = await resolveVoucherContext({
        normalizedType,
        rawSourceType,
        sourceId: effectiveSourceId,
        voucherId: doc.id,
        meta: normalizedMeta,
        voucherCurrency,
      });

      const processEntry = (entry: JournalEntry, direction: 'debit' | 'credit') => {
        if (entry.accountId !== accountId) {
          return;
        }

        const entryAmount = Number(entry.amount ?? (entry as any).debit ?? (entry as any).credit ?? 0);
        const currency = (entry.currency as Currency) || voucherCurrency;
        const signedAmount = (direction === 'debit' ? 1 : -1) * entryAmount;

        if (dateFrom && voucherDate < dateFrom) {
          openingBalances[currency] = (openingBalances[currency] || 0) + signedAmount;
          return;
        }

        if ((dateFrom && voucherDate < dateFrom) || (dateTo && voucherDate > dateTo)) {
          return;
        }

        let description: string | StructuredDescription;
        if (normalizedType === 'distributed_receipt') {
          const baseCurrency = currency;
          const totalAmount = Number(
            v.originalData?.totalAmount ?? normalizedMeta?.totalAmount ?? entryAmount ?? 0,
          );
          const companyAmount = Number(
            v.originalData?.companyAmount ?? normalizedMeta?.companyAmount ?? 0,
          );
          const formattedTotal = new Intl.NumberFormat('en-US').format(totalAmount);
          const formattedCompany = new Intl.NumberFormat('en-US').format(companyAmount);
          const clientName =
            accountLabelMap.get(
              v.originalData?.accountId || normalizedMeta?.accountId || '',
            ) || normalizedMeta?.clientName || '';

          const rawDistributions = normalizedMeta?.distributions || v.originalData?.distributions || {};
          const distributions = Object.entries(rawDistributions)
            .map(([channelId, distData]: [string, any]) => {
              const numericAmount = Number(distData?.amount || 0);
              if (!numericAmount) return null;
              const label =
                distributionChannelLabel.get(channelId) ||
                accountLabelMap.get(channelId) ||
                distData?.name ||
                channelId;
              const formattedAmount = new Intl.NumberFormat('en-US').format(numericAmount);
              const currencyCode = distData?.currency || baseCurrency;
              return {
                name: label,
                amount: `${formattedAmount} ${currencyCode}`,
              };
            })
            .filter(Boolean) as { name: string; amount: string }[];

          description = {
            title: clientName ? `سند قبض موزع من ${clientName}` : 'سند قبض موزع',
            totalReceived: `الإجمالي: ${formattedTotal} ${baseCurrency}`,
            selfReceipt:
              companyAmount > 0 ? `سداد للدافع: ${formattedCompany} ${baseCurrency}` : null,
            distributions,
            notes: v.notes || normalizedMeta?.notes || '',
          };
        } else if (voucherContext?.description) {
          description = voucherContext.description;
        } else if (entry.description) {
          description = entry.description;
        } else if (baseNotes) {
          description = baseNotes;
        } else {
          description = '';
        }

        const oppositeEntries = (direction === 'debit' ? v.creditEntries : v.debitEntries) || [];
        const otherAccountIds = new Set(
          oppositeEntries
            .map((other) => other.accountId)
            .filter((id) => id && id !== entry.accountId),
        );

        const otherPartySet = new Set<string>();
        otherAccountIds.forEach((id) => {
          const label = getAccountLabel(id);
          if (label) otherPartySet.add(label);
        });
        [
          normalizedMeta?.clientName,
          normalizedMeta?.supplierName,
          normalizedMeta?.companyName,
          normalizedMeta?.partnerName,
          normalizedMeta?.from,
          normalizedMeta?.to,
          normalizedMeta?.payee,
        ]
          .filter(Boolean)
          .forEach((name) => otherPartySet.add(name as string));
        (voucherContext?.parties || []).forEach((name) => {
          if (name) otherPartySet.add(name);
        });

        const otherParty = Array.from(otherPartySet).join('، ');

        const noteSources = [voucherContext?.notes, normalizedMeta?.notes, v.notes].filter(
          (note): note is string => Boolean(note && note.trim()),
        );
        const notes = Array.from(new Set(noteSources)).join(' • ');

        reportRows.push({
          id: `${doc.id}_${direction}_${entry.accountId}_${reportRows.length}`,
          date: voucherDate.toISOString(),
          invoiceNumber,
          description,
          debit: direction === 'debit' ? entryAmount : 0,
          credit: direction === 'credit' ? entryAmount : 0,
          currency,
          officer: officerName,
          voucherType: normalizedType,
          normalizedType,
          rawVoucherType: v.voucherType,
          sourceType: normalizedType,
          rawSourceType,
          sourceId: effectiveSourceId,
          sourceRoute:
            v.originalData?.sourceRoute ||
            resolveSourceRoute(normalizedType, effectiveSourceId, doc.id, normalizedMeta, rawSourceType),
          originalData: { ...v.originalData, meta: normalizedMeta },
          notes,
          direction,
          amount: entryAmount,
          type: normalizedType,
          accountId: entry.accountId,
          accountScope: resolvedAccountType,
          relationKind: resolvedRelationKind,
          createdAt: serializeDate(v.createdAt),
          otherParty,
        });
      };

      (v.debitEntries || []).forEach((entry) => processEntry(entry, 'debit'));
      (v.creditEntries || []).forEach((entry) => processEntry(entry, 'credit'));
    }
    

    const filteredRows = voucherType && voucherType.length > 0
        ? reportRows.filter(r => {
            const typeKey = r.normalizedType || r.sourceType || r.voucherType || r.type;
            return typeKey ? voucherType.includes(typeKey) : false;
        })
        : reportRows;

    const runningBalances: Record<string, number> = { ...openingBalances };
    
    const result = filteredRows
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((r: any) => {
            const currency = r.currency || 'USD';
            const previousBalance = runningBalances[currency] ?? 0;
            const nextBalance = previousBalance + (r.debit || 0) - (r.credit || 0);
            runningBalances[currency] = nextBalance;

            const balancesSnapshot = { ...runningBalances };

            return {
                ...r,
                balance: nextBalance,
                balancesByCurrency: balancesSnapshot,
                balanceUSD: balancesSnapshot['USD'] ?? 0,
                balanceIQD: balancesSnapshot['IQD'] ?? 0,
            };
        });

    return { transactions: result, openingBalances };

  } catch (err: any) {
    console.error('❌ Error loading account statement:', err.message);
    if (err.code === 9 || err.code === 'FAILED_PRECONDITION' || (err.message && err.message.includes('requires an index'))) { 
      const urlMatch = err.message.match(/(https?:\/\/[^\s)\]]+)/);
      const indexUrl = urlMatch ? urlMatch[0] : null;
      
      const userMessage = `فشل تحميل كشف الحساب: يتطلب الاستعلام فهرسًا مركبًا في Firestore.`;
      
      if (indexUrl) {
        throw new Error(`FIRESTORE_INDEX_URL::${indexUrl}`);
      } else {
         throw new Error(`${userMessage} يرجى مراجعة سجلات الخادم للحصول على الرابط وإنشاء الفهرس المطلوب.`);
      }
    }
    throw new Error(`فشل تحميل كشف الحساب: ${err.message}`);
  }
}

export async function getClientTransactions(clientId: string) {
    const { transactions, openingBalances } = await getAccountStatement({ accountId: clientId, accountType: 'relation', relationKind: 'client' });
    
    let totalSales = 0;
    let paidAmount = 0;
    let totalProfit = 0;

    transactions.forEach(tx => {
        if(tx.sourceType === 'booking' || tx.sourceType === 'visa' || tx.sourceType === 'subscription') {
             totalSales += tx.debit;
             if (tx.originalData) {
                 const sale = tx.originalData.salePrice || (tx.originalData.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice || 0), 0);
                 const purchase = tx.originalData.purchasePrice || (tx.originalData.passengers || []).reduce((acc: number, p: any) => acc + (p.purchasePrice || 0), 0);
                 totalProfit += sale - purchase;
             }
        } else if (tx.sourceType === 'standard_receipt' || tx.sourceType === 'payment' || tx.sourceType === 'subscription_installment') {
            paidAmount += tx.credit;
        }
    });

    const dueAmount = totalSales - paidAmount;

    return { 
        transactions: transactions.map(tx => ({...tx, id: tx.id || tx.invoiceNumber})),
        totalSales,
        paidAmount,
        dueAmount,
        totalProfit,
        currency: 'USD' as Currency,
    };
}


export async function getDebtsReportData(): Promise<DebtsReportData> {
    const db = await getDb();
    if (!db) return { entries: [], summary: { totalDebitUSD: 0, totalCreditUSD: 0, balanceUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0, balanceIQD: 0 } };

    const { clients } = await getClients({ all: true, includeInactive: false });
    const vouchersSnap = await db.collection("journal-vouchers").get();

    const balances: Record<string, { balanceUSD: number; balanceIQD: number; lastTransaction: string | null }> = {};

    clients.forEach(client => {
        balances[client.id] = { balanceUSD: 0, balanceIQD: 0, lastTransaction: null };
    });
    
    const sortedVouchers = vouchersSnap.docs.sort((a, b) => {
        const dateA = a.data().date;
        const dateB = b.data().date;
        return new Date(dateA).getTime() - new Date(b.date).getTime();
    });

    sortedVouchers.forEach(doc => {
        const v = doc.data() as JournalVoucher;
        if(v.isDeleted) return;

        const processEntries = (entries: LegacyJournalEntry[], isDebit: boolean) => {
            (entries || []).forEach(entry => {
                if (balances[entry.accountId]) {
                    const amount = isDebit ? entry.amount : -entry.amount;
                    if (v.currency === 'USD') {
                        balances[entry.accountId].balanceUSD += amount;
                    } else if (v.currency === 'IQD') {
                        balances[entry.accountId].balanceIQD += amount;
                    }

                    if (!balances[entry.accountId].lastTransaction || v.date > balances[entry.accountId].lastTransaction!) {
                        balances[entry.accountId].lastTransaction = v.date;
                    }
                }
            });
        };

        processEntries(v.debitEntries || [], true);
        processEntries(v.creditEntries || [], false);
    });

    const entries = clients.map((client: Client): DebtsReportEntry => ({
        id: client.id,
        name: client.name,
        code: client.code,
        phone: client.phone,
        accountType: client.relationType,
        balanceUSD: balances[client.id]?.balanceUSD || 0,
        balanceIQD: balances[client.id]?.balanceIQD || 0,
        lastTransaction: balances[client.id]?.lastTransaction || null,
    }));
    
    const summary = entries.reduce((acc, entry) => {
        const balanceUSD = entry.balanceUSD || 0;
        const balanceIQD = entry.balanceIQD || 0;
        
         if ((entry.accountType === 'client' || entry.accountType === 'both')) {
            if (balanceUSD > 0) acc.totalCreditUSD += balanceUSD; else acc.totalDebitUSD -= balanceUSD;
        } else { // Supplier
            if (balanceUSD < 0) acc.totalCreditUSD -= balanceUSD; else acc.totalDebitUSD += balanceUSD;
        }
         if ((entry.accountType === 'client' || entry.accountType === 'both')) {
            if (balanceIQD > 0) acc.totalCreditIQD += balanceIQD; else acc.totalDebitIQD -= balanceIQD;
        } else { // Supplier
            if (balanceIQD < 0) acc.totalCreditIQD -= balanceIQD; else acc.totalDebitIQD += balanceIQD;
        }
        
        return acc;
    }, { totalDebitUSD: 0, totalCreditUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0 });

    return {
        entries,
        summary: {
            ...summary,
            balanceUSD: summary.totalCreditUSD - summary.totalDebitUSD,
            balanceIQD: summary.totalCreditIQD - summary.totalDebitIQD,
        }
    };
}
