export type NormalizedVoucherType =
  | 'standard_receipt'
  | 'distributed_receipt'
  | 'payment'
  | 'manualExpense'
  | 'journal_voucher'
  | 'remittance'
  | 'transfer'
  | 'booking'
  | 'visa'
  | 'subscription'
  | 'segment'
  | 'profit-sharing'
  | 'refund'
  | 'exchange'
  | 'void'
  | 'exchange_transaction'
  | 'exchange_payment'
  | 'exchange_adjustment'
  | 'exchange_revenue'
  | 'exchange_expense'
  | 'other';

const VOUCHER_TYPE_ALIASES: Record<string, NormalizedVoucherType> = {
  journal_from_standard_receipt: 'standard_receipt',
  journal_from_distributed_receipt: 'distributed_receipt',
  journal_from_payment: 'payment',
  journal_from_expense: 'manualExpense',
  journal_from_remittance: 'remittance',
  journal_from_transfer: 'transfer',
  journal_voucher: 'journal_voucher',
  remittance: 'remittance',
  transfer: 'transfer',
  standard_receipt: 'standard_receipt',
  distributed_receipt: 'distributed_receipt',
  payment: 'payment',
  manualExpense: 'manualExpense',
  booking: 'booking',
  visa: 'visa',
  subscription: 'subscription',
  segment: 'segment',
  'profit-sharing': 'profit-sharing',
  refund: 'refund',
  exchange: 'exchange',
  void: 'void',
  exchange_transaction: 'exchange_transaction',
  exchange_payment: 'exchange_payment',
  exchange_adjustment: 'exchange_adjustment',
  exchange_revenue: 'exchange_revenue',
  exchange_expense: 'exchange_expense',
};

export const VOUCHER_TYPE_LABELS: Record<NormalizedVoucherType, string> = {
  standard_receipt: 'سند قبض عادي',
  distributed_receipt: 'سند قبض مخصص',
  payment: 'سند دفع',
  manualExpense: 'سند مصاريف',
  journal_voucher: 'قيد مالي',
  remittance: 'حوالة مالية',
  transfer: 'سند تحويل',
  booking: 'حجز طيران',
  visa: 'طلب فيزا',
  subscription: 'اشتراك',
  segment: 'سكمنت',
  'profit-sharing': 'توزيع أرباح',
  refund: 'استرجاع',
  exchange: 'تغيير تذكرة',
  void: 'إلغاء تذكرة',
  exchange_transaction: 'معاملة بورصة',
  exchange_payment: 'تسديد بورصة',
  exchange_adjustment: 'تسوية بورصة',
  exchange_revenue: 'إيراد بورصة',
  exchange_expense: 'مصروف بورصة',
  other: 'عملية مالية',
};

export function normalizeVoucherType(type?: string): NormalizedVoucherType {
  if (!type) return 'other';
  const trimmed = type.trim();
  if (VOUCHER_TYPE_ALIASES[trimmed]) {
    return VOUCHER_TYPE_ALIASES[trimmed];
  }
  if (trimmed.startsWith('journal_from_')) {
    const candidate = trimmed.replace('journal_from_', '');
    if (VOUCHER_TYPE_ALIASES[candidate]) {
      return VOUCHER_TYPE_ALIASES[candidate];
    }
    return (candidate as NormalizedVoucherType) || 'other';
  }
  return (trimmed as NormalizedVoucherType) || 'other';
}

export function getVoucherTypeLabel(type?: string): string {
  const normalized = normalizeVoucherType(type);
  return VOUCHER_TYPE_LABELS[normalized] || VOUCHER_TYPE_LABELS.other;
}

export const DEFAULT_VOUCHER_TABS_ORDER: NormalizedVoucherType[] = [
  'standard_receipt',
  'distributed_receipt',
  'payment',
  'manualExpense',
  'journal_voucher',
  'remittance',
  'transfer',
  'booking',
  'visa',
  'subscription',
  'segment',
  'profit-sharing',
  'exchange_transaction',
  'exchange_payment',
  'exchange_adjustment',
  'exchange_revenue',
  'exchange_expense',
  'refund',
  'exchange',
  'void',
  'other',
];
