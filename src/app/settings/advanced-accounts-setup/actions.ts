'use server';

import { z } from 'zod';
import { getDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// ===== Types (محلية لتفادي تعديل types.ts الآن) =====
export type COAType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface ChartAccount {
  id: string;                  // doc id
  name: string;
  code: string;                // كود هرمي "1.1.2"
  type: COAType;
  parentId: string | null;     // مرجع حساب الأب أو null للجذر
  isLeaf: boolean;             // هل يقبل ترحيل مباشر؟
  description?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface FinanceAccountsMap {
  generalRevenueId?: string;
  generalExpenseId?: string;
  arAccountId?: string;   // الذمم المدينة
  apAccountId?: string;   // الذمم الدائنة
  defaultCashId?: string;
  defaultBankId?: string;
  customRevenues?: {
    tickets?: string;
    visas?: string;
    subscriptions?: string;
    segments?: string;
  };
  preventDirectCashRevenue?: boolean; // منع تسجيل الربح مباشرة في الصندوق
}

const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC_ID = 'app_settings';
const COA_COLLECTION = 'chart_of_accounts';

const accountSchema = z.object({
  name: z.string().min(2, 'اسم الحساب مطلوب'),
  type: z.enum(['asset','liability','equity','revenue','expense']),
  parentId: z.string().nullable().optional(),
  isLeaf: z.boolean().default(true),
  description: z.string().optional()
});

export async function listAccounts(): Promise<ChartAccount[]> {
  const db = await getDb();
  const snap = await db.collection(COA_COLLECTION).orderBy('code', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ChartAccount[];
}

export async function getFinanceSettings(): Promise<FinanceAccountsMap> {
  const db = await getDb();
  const ref = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID);
  const doc = await ref.get();
  const data = (doc.exists ? (doc.data() as any) : {}) || {};
  return (data.financeAccounts || {}) as FinanceAccountsMap;
}

export async function saveFinanceSettings(payload: FinanceAccountsMap): Promise<void> {
  const db = await getDb();
  const ref = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID);
  await ref.set(
    {
      financeAccounts: payload,
      updatedAt: Timestamp.now()
    },
    { merge: true }
  );
}

// ====== توليد كود هرمي تلقائياً بناءً على الأخوة والحساب الأب ======
export async function generateAccountCode(parentId?: string | null): Promise<string> {
  const db = await getDb();

  // جلب كود الأب إن وجد
  let parentCode: string | null = null;
  if (parentId) {
    const parentDoc = await db.collection(COA_COLLECTION).doc(parentId).get();
    if (!parentDoc.exists) throw new Error('الحساب الأب غير موجود');
    parentCode = (parentDoc.data() as any).code as string;
  }

  // إيجاد أعلى لاحقة للأخوة
  let siblingsQuery = db.collection(COA_COLLECTION).where('parentId', '==', parentId || null);
  const siblings = await siblingsQuery.get();

  // إذا لا يوجد أخوة -> أول رقم
  if (siblings.empty) {
    return parentCode ? `${parentCode}.1` : '1';
  }

  // استخراج آخر مقطع من الكود لكل أخ ثم أخذ الأعلى + 1
  let maxLast = 0;
  siblings.forEach((doc) => {
    const c = (doc.data() as any).code as string;
    const parts = c.split('.');
    const last = parseInt(parts[parts.length - 1], 10) || 0;
    if (last > maxLast) maxLast = last;
  });

  const next = maxLast + 1;
  return parentCode ? `${parentCode}.${next}` : `${next}`;
}

export async function createAccount(raw: z.infer<typeof accountSchema>) {
  const db = await getDb();
  const parsed = accountSchema.parse(raw);

  const code = await generateAccountCode(parsed.parentId || null);
  const now = Timestamp.now();

  const docRef = db.collection(COA_COLLECTION).doc();
  const docData = {
    name: parsed.name,
    code,
    type: parsed.type,
    parentId: parsed.parentId || null,
    isLeaf: !!parsed.isLeaf,
    description: parsed.description || '',
    createdAt: now,
    updatedAt: now
  };
  await docRef.set({id: docRef.id, ...docData});


  // جعل الأب (إن وجد) ليس Leaf
  if (parsed.parentId) {
    await db.collection(COA_COLLECTION).doc(parsed.parentId).set(
      { isLeaf: false, updatedAt: now },
      { merge: true }
    );
  }

  const newDoc = await docRef.get();
  return { id: newDoc.id, ...(newDoc.data() as any) } as ChartAccount;
}
