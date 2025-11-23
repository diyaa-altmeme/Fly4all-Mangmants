
'use server';

import { getDb } from "@/lib/firebase-admin";
import type { VoucherSequence } from "@/lib/types";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const SEQUENCES_COLLECTION = 'sequences';
const DEFAULT_PAD_LENGTH = 5;

type SequenceDocument = {
  label?: string;
  prefix?: string;
  value?: number;
  seq?: number;
  padLength?: number;
  updatedAt?: Timestamp | { toDate(): Date } | string;
  createdAt?: Timestamp | { toDate(): Date } | string;
};

const DEFAULT_SEQUENCES: Record<string, { label: string; prefix: string; padLength?: number }> = {
  RC: { label: 'سند قبض', prefix: 'RC' },
  PV: { label: 'سند دفع', prefix: 'PV' },
  EX: { label: 'سند مصروف', prefix: 'EX' },
  DS: { label: 'سند قبض موزع', prefix: 'DS' },
  JE: { label: 'قيد يومية', prefix: 'JE' },
  TR: { label: 'تحويل/حوالة', prefix: 'TR' },
  BK: { label: 'فاتورة حجز', prefix: 'BK' },
  VS: { label: 'فاتورة فيزا', prefix: 'VS' },
  RF: { label: 'سند مرتجع', prefix: 'RF' },
  EXC: { label: 'معاملة صرف', prefix: 'EXC' },
  EXT: { label: 'عملية بورصة', prefix: 'EXT' },
  EXP: { label: 'دفعة بورصة', prefix: 'EXP' },
  VOID: { label: 'إلغاء', prefix: 'VOID' },
  SEG: { label: 'سكمنت', prefix: 'SEG' },
  COMP: { label: 'حصة شركة', prefix: 'COMP' },
  PARTNER: { label: 'حصة شريك', prefix: 'PARTNER' },
  SUB: { label: 'اشتراك', prefix: 'SUB' },
  SUBP: { label: 'قسط اشتراك', prefix: 'SUBP' },
  PR: { label: 'توزيع أرباح', prefix: 'PR' },
  'PROFIT-SHARING': { label: 'عقد مشاركة أرباح', prefix: 'PR' },
  CL: { label: 'رمز عميل/علاقة', prefix: 'CL' },
};

const DISPLAY_ALIAS_SOURCES: Record<string, string> = {
  'PROFIT-SHARING': 'PR',
};

const SEQUENCE_ALIAS_MAP: Record<string, string> = {
  voucher: 'JE',
  journal: 'JE',
  'journal-voucher': 'JE',
  journal_voucher: 'JE',
  booking: 'BK',
  bookings: 'BK',
  visa: 'VS',
  visas: 'VS',
  refund: 'RF',
  refunds: 'RF',
  payment: 'PV',
  payments: 'PV',
  receipt: 'RC',
  receipts: 'RC',
  standard_receipt: 'RC',
  distributed_receipt: 'DS',
  manualExpense: 'EX',
  manual_expense: 'EX',
  manualexpensevoucher: 'EX',
  remittance: 'TR',
  transfer: 'TR',
  subscription: 'SUB',
  subscription_installment: 'SUBP',
  subscription_overpayment: 'SUBP',
  subscription_adjustment: 'SUB',
  subscription_reversal: 'SUB',
  segment: 'SEG',
  segment_period: 'SEG',
  segment_payout: 'PARTNER',
  partner: 'PARTNER',
  partner_share: 'PARTNER',
  partnerpayment: 'PARTNER',
  company_share: 'COMP',
  comp: 'COMP',
  profit_sharing: 'PR',
  'profit-sharing': 'PR',
  profit_distribution: 'PR',
  exchange: 'EXC',
  exchange_transaction: 'EXT',
  exchanges: 'EXT',
  exchange_payment: 'EXP',
  exchange_expense: 'EXP',
  exchange_revenue: 'EXT',
  exchange_adjustment: 'EXT',
  client: 'CL',
  relation: 'CL',
  supplier: 'CL',
  void: 'VOID',
  salary: 'PV',
};

const sanitizePadLength = (pad?: number): number => {
  const numeric = Number(pad);
  if (!Number.isFinite(numeric)) return DEFAULT_PAD_LENGTH;
  return Math.min(12, Math.max(2, Math.floor(numeric)));
};

const normalizeSequenceId = (rawType?: string | null): string => {
  if (!rawType) return 'JE';
  const trimmed = `${rawType}`.trim();
  if (!trimmed) return 'JE';
  const lower = trimmed.toLowerCase();
  if (SEQUENCE_ALIAS_MAP[lower]) {
    return SEQUENCE_ALIAS_MAP[lower];
  }
  const upper = trimmed.toUpperCase();
  if (DEFAULT_SEQUENCES[upper]) {
    return upper;
  }
  return upper;
};

const resolveFallback = (id: string) => {
  const fallback = DEFAULT_SEQUENCES[id];
  if (fallback) {
    return {
      label: fallback.label,
      prefix: fallback.prefix.toUpperCase(),
      padLength: sanitizePadLength(fallback.padLength ?? DEFAULT_PAD_LENGTH),
    };
  }
  return {
    label: id,
    prefix: id.toUpperCase(),
    padLength: DEFAULT_PAD_LENGTH,
  };
};

const normalizeTimestamp = (value: SequenceDocument['updatedAt']): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return undefined;
};

const toVoucherSequence = (id: string, data?: SequenceDocument | null): VoucherSequence => {
  const fallback = resolveFallback(id);
  const rawValue = typeof data?.value === 'number'
    ? data.value
    : typeof data?.seq === 'number'
      ? data.seq
      : 0;

  const padLength = sanitizePadLength(data?.padLength ?? fallback.padLength);

  return {
    id,
    label: (data?.label ?? fallback.label ?? id).toString(),
    prefix: (data?.prefix ?? fallback.prefix ?? id).toString().toUpperCase(),
    value: Number.isFinite(rawValue) ? Math.max(0, Math.floor(rawValue)) : 0,
    padLength,
    updatedAt: normalizeTimestamp(data?.updatedAt),
  };
};

const formatSequenceNumber = (prefix: string, value: number, padLength: number): string => {
  const sanitizedValue = Math.max(0, Math.floor(value));
  const digits = sanitizePadLength(padLength);
  return `${prefix}-${sanitizedValue.toString().padStart(digits, '0')}`;
};

export async function getSequences(): Promise<VoucherSequence[]> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection is not available.');
  }

  const snapshot = await db.collection(SEQUENCES_COLLECTION).get();
  const sequencesMap = new Map<string, VoucherSequence>();

  snapshot.forEach((doc) => {
    const id = doc.id.toUpperCase();
    const data = doc.data() as SequenceDocument | undefined;
    const normalized = toVoucherSequence(id, data);
    sequencesMap.set(id, normalized);
  });

  Object.keys(DEFAULT_SEQUENCES).forEach((id) => {
    if (sequencesMap.has(id)) return;
    const aliasSource = DISPLAY_ALIAS_SOURCES[id];
    if (aliasSource && sequencesMap.has(aliasSource)) {
      const source = sequencesMap.get(aliasSource)!;
      sequencesMap.set(id, {
        ...source,
        id,
        label: resolveFallback(id).label,
      });
      return;
    }
    sequencesMap.set(id, toVoucherSequence(id, null));
  });

  return Array.from(sequencesMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
}

export async function updateSequence(
  id: string,
  payload: Pick<VoucherSequence, 'label' | 'prefix' | 'value' | 'padLength'>,
): Promise<{ success: boolean; data?: VoucherSequence; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: 'Database connection is not available.' };
  }

  const sequenceId = normalizeSequenceId(id);
  const docRef = db.collection(SEQUENCES_COLLECTION).doc(sequenceId);

  try {
    const updated = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const existing = snapshot.exists ? (snapshot.data() as SequenceDocument) : undefined;
      const fallback = resolveFallback(sequenceId);

      const label = (payload.label ?? existing?.label ?? fallback.label ?? sequenceId).toString().trim();
      const prefix = (payload.prefix ?? existing?.prefix ?? fallback.prefix ?? sequenceId).toString().toUpperCase();
      const value = Number.isFinite(payload.value)
        ? Math.max(0, Math.floor(Number(payload.value)))
        : (typeof existing?.value === 'number'
          ? Math.max(0, Math.floor(existing.value))
          : typeof existing?.seq === 'number'
            ? Math.max(0, Math.floor(existing.seq))
            : 0);
      const padLength = sanitizePadLength(payload.padLength ?? existing?.padLength ?? fallback.padLength);

      transaction.set(docRef, {
        label,
        prefix,
        value,
        seq: value,
        padLength,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return toVoucherSequence(sequenceId, {
        label,
        prefix,
        value,
        padLength,
        updatedAt: new Date().toISOString(),
      });
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error('Failed to update sequence', error);
    const message = error instanceof Error ? error.message : 'Unknown error while updating sequence.';
    return { success: false, error: message };
  }
}

export async function getNextVoucherNumber(type: string = 'JE'): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection is not available.');
  }

  const sequenceId = normalizeSequenceId(type);
  const docRef = db.collection(SEQUENCES_COLLECTION).doc(sequenceId);

  try {
    return await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const existing = snapshot.exists ? (snapshot.data() as SequenceDocument) : undefined;
      const fallback = resolveFallback(sequenceId);

      const currentValue = typeof existing?.value === 'number'
        ? Math.max(0, Math.floor(existing.value))
        : typeof existing?.seq === 'number'
          ? Math.max(0, Math.floor(existing.seq))
          : 0;

      const nextValue = currentValue + 1;
      const prefix = (existing?.prefix ?? fallback.prefix ?? sequenceId).toString().toUpperCase();
      const padLength = sanitizePadLength(existing?.padLength ?? fallback.padLength);

      const updatePayload = {
        label: (existing?.label ?? fallback.label ?? sequenceId).toString(),
        prefix,
        value: nextValue,
        seq: nextValue,
        padLength,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!snapshot.exists) {
        Object.assign(updatePayload, { createdAt: FieldValue.serverTimestamp() });
      }

      transaction.set(docRef, updatePayload, { merge: true });

      return formatSequenceNumber(prefix, nextValue, padLength);
    });
  } catch (error) {
    console.error('Error getting next voucher number:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to generate next voucher number.');
  }
}
