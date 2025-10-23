
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import * as path from 'path';

export async function POST(req: Request, { params }: { params: { action: string } }) {
  const { action } = params;
  const scripts: Record<string, string> = {
    audit_integrity: "scripts/audit_finance_integrity.ts",
    audit_balance: "scripts/audit_balance_checker.ts",
    generate_report: "scripts/generate_audit_report.ts",
    migrate_finance: "scripts/migrate_finance_accounts.ts",
    init_settings: "scripts/init_finance_settings.ts",
  };

  if (!scripts[action]) {
    return NextResponse.json({ message: "❌ أمر غير معروف" }, { status: 400 });
  }

  const scriptPath = path.join(process.cwd(), scripts[action]);

  return new Promise((resolve) => {
    const process = spawn("npx", ["tsx", scriptPath]);

    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => (output += data.toString()));
    process.stderr.on("data", (data) => (errorOutput += data.toString()));

    process.on("close", (code) => {
      if (code !== 0) {
        console.error(`Script error for ${action}:`, errorOutput);
        resolve(NextResponse.json({ message: `❌ فشل تنفيذ السكربت:\n${errorOutput}` }, { status: 500 }));
        return;
      }

      // حالة خاصة لتوليد التقرير: استخراج رابط التحميل
      if (action === "generate_report") {
        const urlMatch = output.match(/DOWNLOAD_URL:(.*)/);
        const downloadUrl = urlMatch ? urlMatch[1].trim() : null;
        if (downloadUrl) {
          resolve(NextResponse.json({ 
            message: `✅ تم إنشاء التقرير بنجاح!`,
            downloadUrl: downloadUrl 
          }));
        } else {
          resolve(NextResponse.json({ message: `⚠️ تم تنفيذ السكربت، ولكن لم يتم العثور على رابط التحميل.\n${output}` }));
        }
      } else {
        resolve(NextResponse.json({ message: output }));
      }
    });
  });
}
