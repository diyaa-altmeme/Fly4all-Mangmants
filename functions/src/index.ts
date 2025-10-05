// functions/src/index.ts
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const AGG_COLLECTION = "aggregates";
const NUM_SHARDS = 32;

function monthIdFromDate(d: admin.firestore.Timestamp | string | Date) {
  const date = (d as any)?.toDate ? (d as any).toDate() : new Date(d as any);
  return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;
}

// Increment aggregates for a company-month
async function incrementAggregates(companyId: string, monthId: string, deltas: any) {
  const docId = `${companyId}_revenue_${monthId}`;
  const ref = db.collection(AGG_COLLECTION).doc(docId);
  const updateData: any = {};
  Object.keys(deltas).forEach(k => {
    updateData[k] = admin.firestore.FieldValue.increment(deltas[k]);
  });
  await ref.set(updateData, { merge: true });
}

// Sharded counter increment
async function incrementShardedCounter(counterId: string, delta = 1) {
  const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
  const shardRef = db.collection(`counters`).doc(counterId).collection("shards").doc(shardId);
  await shardRef.set({ count: admin.firestore.FieldValue.increment(delta) }, { merge: true });
}

const functionOptions = {
  memory: "256MiB" as const,
  timeoutSeconds: 60,
  region: 'us-central1'
};

// On create booking
export const onJournalVoucherCreated = onDocumentCreated(
  { ...functionOptions, document: "journal-vouchers/{voucherId}" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (!data || !['booking', 'visa', 'subscription'].includes(data.voucherType)) return;

    const companyId = data.companyId || "default";
    const monthId = monthIdFromDate(data.date || new Date());

    const salePrice = data.originalData?.salePrice || (data.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice || 0), 0);
    const purchasePrice = data.originalData?.purchasePrice || (data.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.purchasePrice || 0), 0);
    const profit = salePrice - purchasePrice;

    await incrementAggregates(companyId, monthId, { totalRevenue: salePrice, totalCost: purchasePrice, totalProfit: profit, bookingsCount: 1 });
    await incrementShardedCounter(`${companyId}_bookings_count`, 1);
  }
);

// On update booking
export const onJournalVoucherUpdated = onDocumentUpdated(
  { ...functionOptions, document: "journal-vouchers/{voucherId}" },
  async (event) => {
    const before = event.data?.before.data() || {};
    const after = event.data?.after.data() || {};

    if (!['booking', 'visa', 'subscription'].includes(after.voucherType) && !['booking', 'visa', 'subscription'].includes(before.voucherType)) return;

    const companyId = after.companyId || before.companyId || "default";
    const beforeMonth = monthIdFromDate(before.date || new Date());
    const afterMonth = monthIdFromDate(after.date || new Date());

    const beforeSale = before.originalData?.salePrice || (before.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice || 0), 0);
    const beforeCost = before.originalData?.purchasePrice || (before.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.purchasePrice || 0), 0);
    const beforeProfit = beforeSale - beforeCost;

    const afterSale = after.originalData?.salePrice || (after.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice || 0), 0);
    const afterCost = after.originalData?.purchasePrice || (after.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.purchasePrice || 0), 0);
    const afterProfit = afterSale - afterCost;

    if (beforeMonth !== afterMonth) {
      await incrementAggregates(companyId, beforeMonth, { totalRevenue: -beforeSale, totalCost: -beforeCost, totalProfit: -beforeProfit, bookingsCount: before.voucherType === after.voucherType ? -1 : 0 });
      await incrementAggregates(companyId, afterMonth, { totalRevenue: afterSale, totalCost: afterCost, totalProfit: afterProfit, bookingsCount: 1 });
    } else {
      await incrementAggregates(companyId, afterMonth, { totalRevenue: afterSale - beforeSale, totalCost: afterCost - beforeCost, totalProfit: afterProfit - beforeProfit });
    }
  }
);

// On delete booking
export const onJournalVoucherDeleted = onDocumentDeleted(
  { ...functionOptions, document: "journal-vouchers/{voucherId}" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() || {};
    if (!data || !['booking', 'visa', 'subscription'].includes(data.voucherType)) return;

    const companyId = data.companyId || "default";
    const monthId = monthIdFromDate(data.date || new Date());
    const salePrice = data.originalData?.salePrice || (data.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice || 0), 0);
    const purchasePrice = data.originalData?.purchasePrice || (data.originalData?.passengers || []).reduce((acc: number, p: any) => acc + (p.purchasePrice || 0), 0);
    const profit = salePrice - purchasePrice;

    await incrementAggregates(companyId, monthId, { totalRevenue: -salePrice, totalCost: -purchasePrice, totalProfit: -profit, bookingsCount: -1 });
    await incrementShardedCounter(`${companyId}_bookings_count`, -1);
  }
);
