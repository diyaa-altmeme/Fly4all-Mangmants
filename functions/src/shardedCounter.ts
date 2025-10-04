// functions/src/shardedCounter.ts
import * as admin from "firebase-admin";

// Ensure Firebase is initialized. If this file is used standalone,
// you might need initialization logic here as well.
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export async function readShardedCounter(counterId: string): Promise<number> {
  const shardsSnap = await db.collection(`counters`).doc(counterId).collection("shards").get();
  let total = 0;
  shardsSnap.forEach(s => {
    total += Number(s.data().count || 0);
  });
  return total;
}
