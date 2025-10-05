"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onJournalVoucherDeleted = exports.onJournalVoucherUpdated = exports.onJournalVoucherCreated = void 0;
// functions/src/index.ts
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const AGG_COLLECTION = "aggregates";
const NUM_SHARDS = 32; // Expandable if higher throughput is needed
function monthIdFromDate(d) {
    const date = d.toDate ? d.toDate() : new Date(d);
    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;
}
// helper: increment aggregates document for a company-month
async function incrementAggregates(companyId, monthId, deltas) {
    const docId = `${companyId}_revenue_${monthId}`;
    const ref = db.collection(AGG_COLLECTION).doc(docId);
    const updateData = {};
    Object.keys(deltas).forEach(k => {
        updateData[k] = admin.firestore.FieldValue.increment(deltas[k]);
    });
    await ref.set(updateData, { merge: true });
}
// Sharded counter increment
async function incrementShardedCounter(counterId, delta = 1) {
    const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
    const shardRef = db.collection(`counters`).doc(counterId).collection("shards").doc(shardId);
    await shardRef.set({ count: admin.firestore.FieldValue.increment(delta) }, { merge: true });
}
// On create booking (from journal-vouchers)
exports.onJournalVoucherCreated = functions.runWith({
    memory: "256MB",
    timeoutSeconds: 60,
}).firestore
    .document("journal-vouchers/{voucherId}")
    .onCreate(async (snap, ctx) => {
    var _a, _b, _c, _d;
    const data = snap.data();
    if (!data || !['booking', 'visa', 'subscription'].includes(data.voucherType))
        return;
    const companyId = data.companyId || "default";
    const monthId = monthIdFromDate(data.date || new Date());
    const salePrice = ((_a = data.originalData) === null || _a === void 0 ? void 0 : _a.salePrice) || (((_b = data.originalData) === null || _b === void 0 ? void 0 : _b.passengers) || []).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const purchasePrice = ((_c = data.originalData) === null || _c === void 0 ? void 0 : _c.purchasePrice) || (((_d = data.originalData) === null || _d === void 0 ? void 0 : _d.passengers) || []).reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
    const profit = salePrice - purchasePrice;
    // update aggregates
    await incrementAggregates(companyId, monthId, { totalRevenue: salePrice, totalCost: purchasePrice, totalProfit: profit, bookingsCount: 1 });
    // increment counter (example: total bookings)
    await incrementShardedCounter(`${companyId}_bookings_count`, 1);
});
// On update booking (from journal-vouchers)
exports.onJournalVoucherUpdated = functions.runWith({
    memory: "256MB",
    timeoutSeconds: 60,
}).firestore
    .document("journal-vouchers/{voucherId}")
    .onUpdate(async (change, ctx) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    if (!['booking', 'visa', 'subscription'].includes(after.voucherType) && !['booking', 'visa', 'subscription'].includes(before.voucherType))
        return;
    const companyId = after.companyId || before.companyId || "default";
    const beforeMonth = monthIdFromDate(before.date || new Date());
    const afterMonth = monthIdFromDate(after.date || new Date());
    const beforeSale = ((_a = before.originalData) === null || _a === void 0 ? void 0 : _a.salePrice) || (((_b = before.originalData) === null || _b === void 0 ? void 0 : _b.passengers) || []).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const beforeCost = ((_c = before.originalData) === null || _c === void 0 ? void 0 : _c.purchasePrice) || (((_d = before.originalData) === null || _d === void 0 ? void 0 : _d.passengers) || []).reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
    const beforeProfit = beforeSale - beforeCost;
    const afterSale = ((_e = after.originalData) === null || _e === void 0 ? void 0 : _e.salePrice) || (((_f = after.originalData) === null || _f === void 0 ? void 0 : _f.passengers) || []).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const afterCost = ((_g = after.originalData) === null || _g === void 0 ? void 0 : _g.purchasePrice) || (((_h = after.originalData) === null || _h === void 0 ? void 0 : _h.passengers) || []).reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
    const afterProfit = afterSale - afterCost;
    // if month changed, subtract from old month and add to new month
    if (beforeMonth !== afterMonth) {
        await incrementAggregates(companyId, beforeMonth, { totalRevenue: -beforeSale, totalCost: -beforeCost, totalProfit: -beforeProfit, bookingsCount: before.voucherType === after.voucherType ? -1 : 0 });
        await incrementAggregates(companyId, afterMonth, { totalRevenue: afterSale, totalCost: afterCost, totalProfit: afterProfit, bookingsCount: 1 });
    }
    else {
        // same month: apply deltas
        await incrementAggregates(companyId, afterMonth, { totalRevenue: afterSale - beforeSale, totalCost: afterCost - beforeCost, totalProfit: afterProfit - beforeProfit });
    }
});
// On delete booking (from journal-vouchers)
exports.onJournalVoucherDeleted = functions.runWith({
    memory: "256MB",
    timeoutSeconds: 60,
}).firestore
    .document("journal-vouchers/{voucherId}")
    .onDelete(async (snap, ctx) => {
    var _a, _b, _c, _d;
    const data = snap.data() || {};
    if (!data || !['booking', 'visa', 'subscription'].includes(data.voucherType))
        return;
    const companyId = data.companyId || "default";
    const monthId = monthIdFromDate(data.date || new Date());
    const salePrice = ((_a = data.originalData) === null || _a === void 0 ? void 0 : _a.salePrice) || (((_b = data.originalData) === null || _b === void 0 ? void 0 : _b.passengers) || []).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const purchasePrice = ((_c = data.originalData) === null || _c === void 0 ? void 0 : _c.purchasePrice) || (((_d = data.originalData) === null || _d === void 0 ? void 0 : _d.passengers) || []).reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
    const profit = salePrice - purchasePrice;
    await incrementAggregates(companyId, monthId, { totalRevenue: -salePrice, totalCost: -purchasePrice, totalProfit: -profit, bookingsCount: -1 });
    // decrement sharded counter (optional)
    await incrementShardedCounter(`${companyId}_bookings_count`, -1);
});
//# sourceMappingURL=index.js.map