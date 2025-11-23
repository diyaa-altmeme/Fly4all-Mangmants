'use server';

/* eslint-disable no-console */
import { getDb } from "@/lib/firebase/firebase-admin-sdk";
import type { AccountType, ChartAccount } from "@/lib/types";
import { Timestamp } from "firebase-admin/firestore";
import { chartOfAccountsData } from "@/lib/finance/chart-of-accounts-data";

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
