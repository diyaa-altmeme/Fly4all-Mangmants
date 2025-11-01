import { getDb } from '../src/lib/firebase-admin';
import { SEED_ACCOUNTS } from '../src/lib/finance/chart-of-accounts-data';

async function seed() {
  const db = await getDb();
  console.log('Seeding chart_of_accounts with', SEED_ACCOUNTS.length, 'items');
  for (const a of SEED_ACCOUNTS) {
    // Ensure uniqueness by code
    const exists = await db.collection('chart_of_accounts').where('code', '==', a.code).limit(1).get();
    if (!exists.empty) {
      console.log('Skipping existing code', a.code);
      continue;
    }
    const now = new Date();
    await db.collection('chart_of_accounts').add({
      code: a.code,
      name: a.name,
      type: a.type,
      parentId: a.parentId || null,
      parentCode: a.parentCode || null,
      isLeaf: !!a.isLeaf,
      description: a.description || null,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Inserted', a.code);
  }
  console.log('Done seeding');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
/**
 * @fileoverview Seeding script to populate the Chart of Accounts in Firestore.
 * This script reads the predefined chart of accounts data and creates the
 * corresponding documents in the 'chart_of_accounts' collection, establishing
 * the necessary hierarchical relationships.
 *
 * To run this script:
 * `npm run seed:accounts`
 */

import { getDb } from '@/lib/firebase-admin';
import { chartOfAccountsData, type ChartAccountSeed } from '@/lib/finance/chart-of-accounts-data';
import { Timestamp } from 'firebase-admin/firestore';

const CHART_OF_ACCOUNTS_COLLECTION = 'chart_of_accounts';

async function seedChartOfAccounts() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database connection is not available. Aborting.");
    return;
  }

  const coaCollection = db.collection(CHART_OF_ACCOUNTS_COLLECTION);
  console.log("🌱 Starting to seed Chart of Accounts...");

  const codeToIdMap = new Map<string, string>();
  const batch = db.batch();

  // First pass: Create all documents without parentId to get their generated IDs
  for (const account of chartOfAccountsData) {
    const docRef = coaCollection.doc(); // Automatically generate a new ID
    const dataToSet = {
      id: docRef.id,
      code: account.code,
      name: account.name,
      type: account.type,
      isLeaf: account.isLeaf,
      description: account.description,
      parentCode: account.parentCode, // Temporarily store parentCode
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    batch.set(docRef, dataToSet);
    codeToIdMap.set(account.code, docRef.id);
    console.log(`📄 Scheduled creation for: ${account.code} - ${account.name}`);
  }
  await batch.commit();

  console.log("\n🔗 Linking parent accounts...");
  const updateBatch = db.batch();

  // Second pass: Update documents with the correct parentId
  for (const account of chartOfAccountsData) {
    const accountId = codeToIdMap.get(account.code);
    if (!accountId) continue;

    const parentId = account.parentCode ? codeToIdMap.get(account.parentCode) : null;
    const docRef = coaCollection.doc(accountId);
    
    updateBatch.update(docRef, { parentId: parentId || null });
    console.log(`🔗 Linking ${account.code} to parent ${account.parentCode || 'ROOT'}`);
  }

  // Commit all updates at once
  await updateBatch.commit();

  console.log("\n✅ Chart of Accounts seeding completed successfully!");
}

seedChartOfAccounts()
  .then(() => {
    console.log("Script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed with an error:", error);
    process.exit(1);
  });
