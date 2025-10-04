

import React from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { getReconciliationLogById } from '../../actions';
import type { ReconciliationLog } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ResultsDisplay from '@/components/reconciliation/results-display';


export default async function ReconciliationLogDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  const [log, error] = await getReconciliationLogById(id).then(res => [res, null]).catch(e => [null, e.message]);

  if (error) {
     return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>حدث خطأ!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }
  
  if (!log) {
    notFound();
  }

  const results = {
    summary: log.summary,
    records: [] // Empty as we don't store detailed records in the log
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/reconciliation/history">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">تفاصيل التدقيق</h1>
            <p className="text-muted-foreground">
                تم إجراء هذه العملية بواسطة <span className="font-semibold">{log.userName}</span> في تاريخ {format(parseISO(log.runAt), 'yyyy-MM-dd, HH:mm')}
            </p>
          </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>ملخص النتائج</CardTitle>
            </CardHeader>
            <CardContent>
                <ResultsDisplay results={results} settingsFields={log.settings.matchingFields} currency={log.currency} />
            </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>ملاحظة هامة</CardTitle>
          </CardHeader>
          <CardContent>
             <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>عرض بيانات محدود</AlertTitle>
                <AlertDescription>
                   يعرض هذا السجل ملخص النتائج والإعدادات التي تم استخدامها فقط. لا يتم تخزين قائمة السجلات التفصيلية (المتطابقة، المفقودة، إلخ) للحفاظ على أداء قاعدة البيانات. لإعادة توليد النتائج التفصيلية، يجب إعادة عملية التدقيق مرة أخرى بنفس الملفات والإعدادات.
                </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
  );
}
