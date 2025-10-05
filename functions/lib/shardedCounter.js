"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readShardedCounter = readShardedCounter;
// functions/src/shardedCounter.ts
const admin = require("firebase-admin");
// Ensure Firebase is initialized. If this file is used standalone,
// you might need initialization logic here as well.
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
async function readShardedCounter(counterId) {
    const shardsSnap = await db.collection(`counters`).doc(counterId).collection("shards").get();
    let total = 0;
    shardsSnap.forEach(s => {
        total += Number(s.data().count || 0);
    });
    return total;
}
//# sourceMappingURL=shardedCounter.js.map