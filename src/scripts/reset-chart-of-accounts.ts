#!/usr/bin/env tsx
/**
 * ⚠️ هذا السكربت يحذف كل محتوى مجموعة chart_of_accounts ويعيد إنشاءها من الصفر.
 * شغّله فقط إذا كنت متأكدًا من رغبتك في إعادة ضبط الدليل المحاسبي.
 *
 * تشغيل:
 *   npm run reset:accounts
 */

import { getDb } from "@/lib/firebase-admin";

const accountsSeed = [
  { code: "1", name: "الأصول" },
  { code: "1-1", name: "الأصول المتداولة" },
  { code: "1-1-1", name: "الصناديق والبنوك" },
  { code: "1-1-2", name: "الذمم المدينة" },
  { code: "1-1-2-1", name: "العملاء" },
  { code: "1-1-2-2", name: "البورصات" },
  { code: "1-1-3", name: "حسابات تسوية" },
  { code: "1-2", name: "الأصول الثابتة" },
  { code: "2", name: "الالتزامات" },
  { code: "2-1", name: "الالتزامات المتداولة" },
  { code: "2-1-1", name: "الذمم الدائنة" },
  { code: "2-1-1-1", name: "الموردين" },
  { code: "2-1-1-2", name: "الشركاء الدائنون" },
  { code: "3", name: "حقوق الملكية" },
  { code: "3-1", name: "رأس المال" },
  { code: "3-2", name: "الأرباح المرحلة" },
  { code: "3-3", name: "ملخص الدخل (حساب إغلاق)" },
  { code: "4", name: "الإيرادات" },
  { code: "4-1", name: "إيرادات النشاط الرئيسي" },
  { code: "4-1-1", name: "إيرادات تذاكر الطيران" },
  { code: "4-1-2", name: "إيرادات الفيزا" },
  { code: "4-1-3", name: "إيرادات الاشتراكات" },
  { code: "4-1-4", name: "إيرادات السكمنت" },
  { code: "4-2", name: "إيرادات أخرى" },
  { code: "4-2-1", name: "إيرادات توزيع الأرباح" },
  { code: "4-2-2", name: "إيرادات رسوم الاسترجاع والتغيير" },
  { code: "5", name: "المصروفات" },
  { code: "5-1", name: "تكاليف النشاط الرئيسي" },
  { code: "5-1-1", name: "تكلفة تذاكر الطيران" },
  { code: "5-1-2", name: "تكلفة الفيزا" },
  { code: "5-1-3", name: "تكلفة الاشتراكات" },
  { code: "5-2", name: "المصروفات التشغيلية" },
  { code: "5-2-1", name: "مصروفات الرواتب والأجور" },
  { code: "5-2-2", name: "مصروفات الإيجار" },
  { code: "5-2-3", name: "مصروفات فواتير وخدمات" },
  { code: "5-2-4", name: "مصروفات التسويق والإعلان" },
];

async function main() {
  const db = await getDb();
  const col = db.collection("chart_of_accounts");

  console.log("🚨 حذف جميع الحسابات القديمة...");
  const snap = await col.get();
  const batchSize = 400;
  let batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`✅ تم حذف ${count} حساب.`);

  console.log("🌱 إعادة إنشاء الحسابات الأساسية...");
  const batch2 = db.batch();
  const createdIds: Record<string, FirebaseFirestore.DocumentReference> = {};

  for (const acc of accountsSeed) {
    const ref = col.doc();
    const parentCode = acc.code.includes("-")
      ? acc.code.split("-").slice(0, -1).join("-")
      : "ROOT";
    const data = {
      code: acc.code,
      name: acc.name,
      parentCode,
      createdAt: new Date(),
    };
    batch2.set(ref, data);
    createdIds[acc.code] = ref;
  }

  await batch2.commit();
  console.log("📄 تم إنشاء جميع الحسابات بنجاح.");

  console.log("🔗 ربط الحسابات الفرعية بالأصول...");
  const snap2 = await col.get();
  const allDocs = snap2.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  const updates = db.batch();
  for (const doc of allDocs) {
    if (doc.parentCode && doc.parentCode !== "ROOT") {
      const parent = allDocs.find(d => d.code === doc.parentCode);
      if (parent) {
        updates.update(col.doc(doc.id), { parentId: parent.id });
      }
    }
  }
  await updates.commit();
  console.log("✅ تم الربط بنجاح.");
  console.log("🎉 تمت إعادة ضبط شجرة الحسابات بالكامل.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
