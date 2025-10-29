
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

async function seedChartOfAccounts() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database connection is not available. Aborting.");
    return;
  }

  const coaCollection = db.collection('chart_of_accounts');
  console.log("🌱 Starting to seed Chart of Accounts...");

  const codeToIdMap = new Map<string, string>();

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
    await docRef.set(dataToSet);
    codeToIdMap.set(account.code, docRef.id);
    console.log(`📄 Created initial doc for: ${account.code} - ${account.name}`);
  }

  console.log("\n🔗 Linking parent accounts...");
  const batch = db.batch();

  // Second pass: Update documents with the correct parentId
  for (const account of chartOfAccountsData) {
    const accountId = codeToIdMap.get(account.code);
    if (!accountId) continue;

    const parentId = account.parentCode ? codeToIdMap.get(account.parentCode) : null;
    const docRef = coaCollection.doc(accountId);
    
    // Schedule the update in a batch
    batch.update(docRef, { parentId: parentId || null });
    console.log(`🔗 Linking ${account.code} to parent ${account.parentCode || 'ROOT'}`);
  }

  // Commit all updates at once
  await batch.commit();

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
