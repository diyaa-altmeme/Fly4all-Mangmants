
"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle, DatabaseZap, RefreshCw, ClipboardCheck, Scale, FileBarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FinanceToolsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");

  const runCommand = async (action: string) => {
    setLoading(action);
    setResult("");

    try {
      const res = await fetch(`/api/finance-tools/${action}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "حدث خطأ غير متوقع");
      }

      setResult(data.message || "تم التنفيذ بنجاح ✅");
      toast({ title: "نجاح", description: data.message || "تم التنفيذ بنجاح" });

      // ✅  التحسين: تحميل التقرير مباشرة
      if (action === "generate_report" && data.downloadUrl) {
        toast({ title: "جاري تحميل التقرير...", description: `سيتم تنزيل الملف: ${data.downloadUrl}` });
        window.location.href = data.downloadUrl;
      }

    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
      setResult(`❌ فشل التنفيذ:\n${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <DatabaseZap className="h-6 w-6 text-primary" /> لوحة الأدوات المالية المتقدمة
      </h1>
      <p className="text-muted-foreground">من هنا يمكنك تنفيذ جميع مهام النظام المالي دون الحاجة للـ Terminal.</p>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* سلامة القيود */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-green-600" /> فحص سلامة القيود</CardTitle>
            <CardDescription>يتحقق من وجود قيد لكل عملية مالية ويصلح المفقود.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => runCommand("audit_integrity")} disabled={loading !== null}>
              {loading === "audit_integrity" ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              تشغيل الفحص
            </Button>
          </CardFooter>
        </Card>

        {/* توازن القيود */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-blue-600" /> فحص التوازن المحاسبي</CardTitle>
            <CardDescription>يتأكد من أن جميع القيود المحاسبية متوازنة (Debit = Credit).</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => runCommand("audit_balance")} disabled={loading !== null}>
              {loading === "audit_balance" ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              تشغيل الفحص
            </Button>
          </CardFooter>
        </Card>

        {/* تقرير التدقيق */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5 text-purple-600" /> توليد وتحميل تقرير</CardTitle>
            <CardDescription>ينشئ تقرير Excel ويقوم بتحميله مباشرة.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => runCommand("generate_report")} disabled={loading !== null}>
              {loading === "generate_report" ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              إنشاء وتحميل
            </Button>
          </CardFooter>
        </Card>

        {/* ترحيل البيانات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-orange-600" /> ترحيل البيانات القديمة</CardTitle>
            <CardDescription>يربط العمليات القديمة بالقيود الجديدة.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => runCommand("migrate_finance")} disabled={loading !== null}>
              {loading === "migrate_finance" ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              تنفيذ الترحيل
            </Button>
          </CardFooter>
        </Card>

        {/* إعادة التهيئة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600" /> إعادة تهيئة الإعدادات</CardTitle>
            <CardDescription>ينشئ وثيقة إعدادات التمويل في قاعدة البيانات.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => runCommand("init_settings")} disabled={loading !== null} variant="destructive">
              {loading === "init_settings" ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              تشغيل التهيئة
            </Button>
          </CardFooter>
        </Card>
      </div>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> نتيجة التنفيذ</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono">{result}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
