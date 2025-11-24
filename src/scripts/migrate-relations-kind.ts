
#!/usr/bin/env tsx
/* eslint-disable no-console */
import { getDb } from "@/lib/firebase/firebase-admin-sdk";
import type { FinanceAccountsMap, Relation } from "@/lib/types";

async function main() {
  const db = await getDb();

  // جلب الإعدادات لتحديد الحسابات الأب
  const sDoc = await db.collection("settings").doc("app_settings").get();
  const fa = (sDoc.data()?.financeAccounts || {}) as FinanceAccountsMap;

  if (!fa.receivableAccountId || !fa.payableAccountId || !fa.hybridRelationAccountId) {
    throw new Error("Finance accounts mapping is missing (AR/AP/Hybrid). Configure it first.");
  }

  const rels = await db.collection("clients").get(); // أو "relations" إن كان اسم المجموعة موحدًا
  let updated = 0;

  for (const d of rels.docs) {
    const r = d.data() as Partial<Relation>;
    let type: "client" | "supplier" | "both" = "client";

    // حدّد النوع وفق حقول مشروعك الحالية:
    // إن كان لديك field مثل: relationType أو flags، استبدل المنطق أدناه وفقًا له.
    if (r.type === "supplier") type = "supplier";
    else if (r.type === "both") type = "both";
    else type = "client";

    let accountId = fa.receivableAccountId;
    if (type === "supplier") accountId = fa.payableAccountId;
    if (type === "both") accountId = fa.hybridRelationAccountId as string;

    await d.ref.set(
      {
        type,
        accountId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    updated++;
  }

  console.log(`✅ migrated relations: ${updated}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
