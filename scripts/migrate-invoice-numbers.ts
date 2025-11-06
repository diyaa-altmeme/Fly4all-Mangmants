// تشغيل: NODE_ENV=production node --loader ts-node/esm scripts/migrate-invoice-numbers.ts
import { getDb, getAuthAdmin } from "../src/lib/firebase-admin"; // مسار init الخاص بك
import fs from "fs";
import { getNextVoucherNumber } from "../src/lib/sequences";
import * as admin from 'firebase-admin';

const COLLECTIONS = [
  "journal_vouchers",
  "subscriptions",
  "segments",
  "bookings",
  "visas",
  "exchange_transaction_batches",
  // أضف كل المجموعات التي تحتاجها
];

const DRY_RUN = process.env.DRY_RUN === "true"; // افتراضي false
const BATCH_SIZE = 400;
const BACKUP_PREFIX = "migration_backups/invoice_fix";


async function backupDoc(collection: string, id: string, data: any) {
  const path = `${BACKUP_PREFIX}/${collection}/${id}`;
  return db.doc(path).set({ original: data, migratedAt: admin.firestore.FieldValue.serverTimestamp() });
}

async function processCollection(collection: string) {
  console.log("Processing", collection);
  const db = await getDb();
  const colRef = db.collection(collection);
  let lastDoc = null;
  const csvLines = ["collection,id,oldInvoice,newInvoice"];
  let totalDocsProcessed = 0;

  while (true) {
    let q = colRef.orderBy("__name__").limit(BATCH_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const data = doc.data();
      const id = doc.id;
      const hasInvoice = !!data.invoiceNumber;
      let needsAssign = false;
      
      // Define a generic prefix based on collection if needed
      const prefixId = collection.substring(0, 3).toUpperCase();
      
      if (!hasInvoice || typeof data.invoiceNumber !== "string") {
        needsAssign = true;
      }

      if (needsAssign) {
        const newInv = await getNextVoucherNumber(prefixId); // Use your centralized function
        csvLines.push([collection, id, data.invoiceNumber || "", newInv].join(","));
        
        if (!DRY_RUN) {
          await backupDoc(collection, id, data);
          await db.doc(`${collection}/${id}`).update({
            invoiceNumber: newInv,
            invoiceNumberSource: "migration-2025-11-06",
            invoiceAssignedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      lastDoc = doc;
      totalDocsProcessed++;
    }
    console.log(`Processed ${totalDocsProcessed} documents in ${collection}...`);
    if (snap.size < BATCH_SIZE) break;
  }
  
  if (csvLines.length > 1) {
    fs.appendFileSync(`migration_log_${collection}.csv`, csvLines.join("\n") + "\n");
    console.log(`Log file for ${collection} created/updated.`);
  } else {
    console.log(`No changes needed for ${collection}.`);
  }
}

async function main() {
  console.log(`Starting migration. DRY_RUN is ${DRY_RUN}`);
  for (const c of COLLECTIONS) {
    await processCollection(c);
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
