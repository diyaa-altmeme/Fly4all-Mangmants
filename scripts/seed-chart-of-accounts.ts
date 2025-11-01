#!/usr/bin/env tsx
/* eslint-disable no-console */
import { getDb } from "@/lib/firebase-admin";
import type { AccountType, ChartAccount } from "@/lib/types";

type NodeDef = {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string | null;
  isLeaf?: boolean;
  description?: string;
};

const NODES: NodeDef[] = [
  // 1 - الأصول
  { code: "1", name: "الأصول", type: "asset" },
  { code: "1-1", name: "الأصول المتداولة", type: "asset", parentCode: "1" },
  { code: "1-1-1", name: "الصناديق والبنوك", type: "asset", parentCode: "1-1" },
  { code: "1-1-2", name: "الذمم المدينة", type: "asset", parentCode: "1-1" },
  { code: "1-1-2-1", name: "العملاء", type: "asset", parentCode: "1-1-2" },
  { code: "1-1-2-2", name: "العملاء/الموردون (علاقات مزدوجة)", type: "asset", parentCode: "1-1-2" }, // NEW
  { code: "1-1-3", name: "حسابات تسوية", type: "clearing", parentCode: "1-1" }, // NEW
  { code: "1-2", name: "الأصول الثابتة", type: "asset", parentCode: "1" },

  // 2 - الالتزامات
  { code: "2", name: "الالتزامات", type: "liability" },
  { code: "2-1", name: "الالتزامات المتداولة", type: "liability", parentCode: "2" },
  { code: "2-1-1", name: "الذمم الدائنة", type: "liability", parentCode: "2-1" },
  { code: "2-1-1-1", name: "الموردون", type: "liability", parentCode: "2-1-1" },
  { code: "2-1-2", name: "العملاء/الموردون (علاقات مزدوجة)", type: "liability", parentCode: "2-1" }, // مرآة للجانب الدائن

  // 3 - حقوق الملكية
  { code: "3", name: "حقوق الملكية", type: "equity" },
  { code: "3-1", name: "رأس المال", type: "equity", parentCode: "3" },
  { code: "3-2", name: "الأرباح المرحلة", type: "equity", parentCode: "3" },
  { code: "3-3", name: "ملخص الدخل (حساب إغلاق)", type: "equity", parentCode: "3" },

  // 4 - الإيرادات
  { code: "4", name: "الإيرادات", type: "revenue" },
  { code: "4-1", name: "إيرادات النشاط الرئيسي", type: "revenue", parentCode: "4" },
  { code: "4-1-1", name: "إيرادات تذاكر الطيران", type: "revenue", parentCode: "4-1", isLeaf: true },
  { code: "4-1-2", name: "إيرادات الفيزا", type: "revenue", parentCode: "4-1", isLeaf: true },
  { code: "4-1-3", name: "إيرادات الاشتراكات", type: "revenue", parentCode: "4-1", isLeaf: true },
  { code: "4-1-4", name: "إيرادات السكمنت", type: "revenue", parentCode: "4-1", isLeaf: true },
  { code: "4-2", name: "إيرادات أخرى", type: "revenue", parentCode: "4" },
  { code: "4-2-1", name: "إيرادات توزيع الأرباح", type: "revenue", parentCode: "4-2", isLeaf: true },
  { code: "4-2-2", name: "رسوم الاسترجاع والتغيير", type: "revenue", parentCode: "4-2", isLeaf: true },

  // 5 - المصروفات
  { code: "5", name: "المصروفات", type: "expense" },
  { code: "5-1", name: "تكاليف النشاط الرئيسي", type: "expense", parentCode: "5" },
  { code: "5-1-1", name: "تكلفة تذاكر الطيران", type: "expense", parentCode: "5-1", isLeaf: true },
  { code: "5-1-2", name: "تكلفة الفيزا", type: "expense", parentCode: "5-1", isLeaf: true },
  { code: "5-1-3", name: "تكلفة الاشتراكات", type: "expense", parentCode: "5-1", isLeaf: true },
  { code: "5-1-4", name: "مصروفات الشركاء/التوزيع", type: "expense", parentCode: "5-1", isLeaf: true }, // NEW
  { code: "5-2", name: "المصروفات التشغيلية", type: "expense", parentCode: "5" },
  { code: "5-2-1", name: "الرواتب والأجور", type: "expense", parentCode: "5-2", isLeaf: true },
  { code: "5-2-2", name: "الإيجار", type: "expense", parentCode: "5-2", isLeaf: true },
  { code: "5-2-3", name: "فواتير وخدمات", type: "expense", parentCode: "5-2", isLeaf: true },
  { code: "5-2-4", name: "التسويق والإعلان", type: "expense", parentCode: "5-2", isLeaf: true },
];

async function main() {
  console.log("Initializing Firebase Admin SDK...");
  const db = await getDb();
  console.log("Firebase Admin SDK initialized successfully.");

  const col = db.collection("chart_of_accounts");

  console.log("🌱 Seeding Chart of Accounts...");
  const now = new Date();

  // أنشئ أو حدّث كل عقدة
  for (const node of NODES) {
    const docId = node.code; // نستخدم الكود كمُعرّف
    const ref = col.doc(docId);
    const payload: Partial<ChartAccount> = {
      id: docId,
      code: node.code,
      name: node.name,
      type: node.type,
      parentCode: node.parentCode ?? null,
      parentId: null,
      isLeaf: node.isLeaf ?? false,
      description: node.description,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(payload, { merge: true });
    console.log(`📄 upsert: ${node.code} - ${node.name}`);
  }

  // ربط parentId انطلاقًا من parentCode
  const snap = await col.get();
  const mapByCode = new Map<string, FirebaseFirestore.DocumentSnapshot>();
  snap.docs.forEach(d => mapByCode.set(d.id, d));

  console.log("🔗 Linking parents...");
  for (const node of NODES) {
    if (!node.parentCode) continue;
    const selfRef = col.doc(node.code);
    const parentRef = mapByCode.get(node.parentCode);
    if (parentRef?.exists) {
      await selfRef.update({ parentId: parentRef.id });
      console.log(`🔗 ${node.code} → parent: ${node.parentCode}`);
    }
  }

  console.log("✅ Chart of Accounts seeded successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

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
