"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onJournalVoucherDeleted = exports.onJournalVoucherUpdated = exports.onJournalVoucherCreated = void 0;
// functions/src/index.ts
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const AGG_COLLECTION = "aggregates";
const NUM_SHARDS = 32;
function monthIdFromDate(d) {
    const date = (d === null || d === void 0 ? void 0 : d.toDate) ? d.toDate() : new Date(d);
    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;
}
// Increment aggregates for a company-month
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
const functionOptions = {
    memory: "256MiB",
    timeoutSeconds: 60,
    region: 'us-central1'
};
// On create booking
exports.onJournalVoucherCreated = (0, firestore_1.onDocumentCreated)(Object.assign(Object.assign({}, functionOptions), { document: "journal-vouchers/{voucherId}" }), async (event) => {
    var _a, _b, _c, _d;
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    if (!data || !['booking', 'visa', 'subscription'].includes(data.voucherType))
        return;
    const companyId = data.companyId || "default";
    const monthId = monthIdFromDate(data.date || new Date());
    const salePrice = ((_a = data.originalData) === null || _a === void 0 ? void 0 : _a.salePrice) || (((_b = data.originalData) === null || _b === void 0 ? void 0 : _b.passengers) || []).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const purchasePrice = ((_c = data.originalData) === null || _c === void 0 ? void 0 : _c.purchasePrice) || (((_d = data.originalData) === null || _d === void 0 ? void 0 : _d.passengers) || []).reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
    const profit = salePrice - purchasePrice;
    await incrementAggregates(companyId, monthId, { totalRevenue: salePrice, totalCost: purchasePrice, totalProfit: profit, bookingsCount: 1 });
    await incrementShardedCounter(`${companyId}_bookings_count`, 1);
});
// On update booking
exports.onJournalVoucherUpdated = (0, firestore_1.onDocumentUpdated)(Object.assign(Object.assign({}, functionOptions), { document: "journal-vouchers/{voucherId}" }), async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const before = ((_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data()) || {};
    const after = ((_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data()) || {};
    if (!['booking', 'visa', 'subscription'].includes(after.voucherType) && !['booking', 'visa', 'subscription'].includes(before.voucherType))
        return;
    const companyId = after.companyId || before.companyId || "default";
    const beforeMonth = monthIdFromDate(before.date || new Date());
    const afterMonth = monthIdFromDate(after.date || new Date());
    const beforeSale = ((_c = before.originalData) === null || _c === void 0 ? void 0 : _c.salePrice) || (((_d = before.originalData) === null || _d === void 0 ? void 0 : _d.passengers) || []).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const beforeCost = ((_e = before.originalData) === null || _e === void 0 ? void 0 : _e.purchasePrice) || (((_f = before.originalData) === null || _f === void 0 ? void 0 : _f.passengers) || []).reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
    const beforeProfit = beforeSale - beforeCost;
    const afterSale = ((_g = after.originalData) === null || _g === void 0 ? void 0 : _g.salePrice) || (((_h = after.originalData) === null || _h === void 0 ? void 0 : _h.passengers) || []).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const afterCost = ((_j = after.originalData) === null || _j === void 0 ? void 0 : _j.purchasePrice) || (((_k = after.originalData) === null || _k === void 0 ? void 0 : _k.passengers) || []).reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
    const afterProfit = afterSale - afterCost;
    if (beforeMonth !== afterMonth) {
        await incrementAggregates(companyId, beforeMonth, { totalRevenue: -beforeSale, totalCost: -beforeCost, totalProfit: -beforeProfit, bookingsCount: before.voucherType === after.voucherType ? -1 : 0 });
        await incrementAggregates(companyId, afterMonth, { totalRevenue: afterSale, totalCost: afterCost, totalProfit: afterProfit, bookingsCount: 1 });
    }
    else {
        await incrementAggregates(companyId, afterMonth, { totalRevenue: afterSale - beforeSale, totalCost: afterCost - beforeCost, totalProfit: afterProfit - beforeProfit });
    }
});
// On delete booking
exports.onJournalVoucherDeleted = (0, firestore_1.onDocumentDeleted)(Object.assign(Object.assign({}, functionOptions), { document: "journal-vouchers/{voucherId}" }), async (event) => {
    var _a, _b, _c, _d;
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data() || {};
    if (!data || !['booking', 'visa', 'subscription'].includes(data.voucherType))
        return;
    const companyId = data.companyId || "default";
    const monthId = monthIdFromDate(data.date || new Date());
    const salePrice = ((_a = data.originalData) === null || _a === void 0 ? void 0 : _a.salePrice) || (((_b = data.originalData) === null || _b === void 0 ? void 0 : _b.passengers) || []).reduce((acc, p) => acc + (p.salePrice || 0), 0);
    const purchasePrice = ((_c = data.originalData) === null || _c === void 0 ? void 0 : _c.purchasePrice) || (((_d = data.originalData) === null || _d === void 0 ? void 0 : _d.passengers) || []).reduce((acc, p) => acc + (p.purchasePrice || 0), 0);
    const profit = salePrice - purchasePrice;
    await incrementAggregates(companyId, monthId, { totalRevenue: -salePrice, totalCost: -purchasePrice, totalProfit: -profit, bookingsCount: -1 });
    await incrementShardedCounter(`${companyId}_bookings_count`, -1);
});
//# sourceMappingURL=index.js.map