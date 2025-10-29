
import { getDb } from "@/lib/firebase-admin";
import type { FinanceAccountsMap } from "@/lib/types";

// جلب خريطة الربط من الإعدادات (كاش بسيط اختياري)
let _cache: { at: number; map: FinanceAccountsMap | null } = { at: 0, map: null };

export async function getFinanceMap(): Promise<FinanceAccountsMap> {
  const now = Date.now();
  if (_cache.map && now - _cache.at < 15_000) return _cache.map; // cache 15s

  const db = await getDb();
  const ref = db.collection("settings").doc("app_settings");
  const snap = await ref.get();
  const fm = (snap.data()?.financeAccounts || {}) as FinanceAccountsMap;
  _cache = { at: now, map: fm };
  return fm;
}

// مثال: إنشاء قيد إيراد لوحدة معينة (tickets/visas/...)
export async function postRevenue({
  sourceType, sourceId, date, currency, amount,
  clientId, // يُحفظ بالـ meta فقط (لا ننشئ حساب فرعي)
}: {
  sourceType: "tickets"|"visas"|"subscriptions"|"segments"|"profit_distribution";
  sourceId: string;
  date: string | Date;
  currency: string;
  amount: number;
  clientId?: string;
}) {
  if (amount <= 0) return;

  const db = await getDb();
  const fm = await getFinanceMap();

  const revenueAccountId = fm.revenueMap?.[sourceType];
  const arId = fm.receivableAccountId;
  if (!revenueAccountId || !arId) {
    throw new Error(`Missing mapping: revenue=${revenueAccountId} or AR=${arId}`);
  }

  if (fm.preventDirectCashRevenue && fm.defaultCashId) {
    // إيراد آجل (مدين: الذمم / دائن: الإيراد)
    return db.collection("journal-vouchers").add({
      date,
      currency,
      sourceType,
      sourceId,
      lines: [
        { accountId: arId, debit: amount, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: amount },
      ],
      meta: { clientId },
      createdAt: new Date(),
    });
  } else {
    // إيراد نقدي مباشرة (مدين: الصندوق / دائن: الإيراد)
    const cashId = fm.defaultCashId || arId; // fallback سيئ؛ الأفضل إجبار الربط
    return db.collection("journal-vouchers").add({
      date,
      currency,
      sourceType,
      sourceId,
      lines: [
        { accountId: cashId, debit: amount, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: amount },
      ],
      meta: { clientId, directCash: true },
      createdAt: new Date(),
    });
  }
}

// مثال: تسجيل تكلفة
export async function postCost({
  costKey, // cost_tickets/cost_visas/...
  sourceType, sourceId, date, currency, amount, supplierId
}: {
  costKey: keyof NonNullable<FinanceAccountsMap["expenseMap"]>;
  sourceType: string; sourceId: string;
  date: string|Date; currency: string; amount: number;
  supplierId?: string;
}) {
  if (amount <= 0) return;
  const db = await getDb();
  const fm = await getFinanceMap();
  const expId = fm.expenseMap?.[costKey];
  const apId = fm.payableAccountId;
  if (!expId || !apId) throw new Error(`Missing mapping: expense=${expId} or AP=${apId}`);

  return db.collection("journal-vouchers").add({
    date, currency, sourceType, sourceId,
    lines: [
      { accountId: expId, debit: amount, credit: 0 },
      { accountId: apId, debit: 0, credit: amount },
    ],
    meta: { supplierId },
    createdAt: new Date(),
  });
}
