#!/usr/bin/env tsx
/**
 * 🔍 سكربت لفحص جميع صفحات المشروع (App Router)
 * ويقوم بطباعة جميع المسارات الموجودة على شكل JSON منظم.
 *
 * لتشغيل السكربت:
 *    npm run scan:pages
 */

import fs from "fs";
import path from "path";

const APP_DIR = path.resolve("src/app");

function walk(dir: string, base = ""): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const pages: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(base, entry.name);

    if (entry.isDirectory()) {
      pages.push(...walk(fullPath, relativePath));
    } else if (entry.name === "page.tsx" || entry.name === "page.jsx") {
      const route = "/" + relativePath.replace("/page.tsx", "").replace("/page.jsx", "");
      pages.push(route);
    }
  }

  return pages;
}

function main() {
  if (!fs.existsSync(APP_DIR)) {
    console.error("❌ لم يتم العثور على مجلد src/app");
    process.exit(1);
  }

  const allPages = walk(APP_DIR)
    .filter((r) => !r.includes("(auth)") && !r.includes("(api)"))
    .sort();

  console.log("\n📂 جميع الصفحات المكتشفة داخل src/app:\n");
  console.log(JSON.stringify(allPages, null, 2));
  console.log(`\n✅ المجموع الكلي: ${allPages.length} صفحة\n`);
}

main();
