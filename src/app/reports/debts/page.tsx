
import React, { Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { getDebtsReportData } from '@/app/reports/actions';
import DebtsReport from '@/components/reports/debts-report';


async function DebtsReportContainer() {
    const [debtsReportData, error] = await getDebtsReportData().then(res => [res, null]).catch(e => [null, e.message]);
    
    if (error || !debtsReportData) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل بيانات الأرصدة."}</AlertDescription>
            </Alert>
        );
    }
    
    return <DebtsReport initialData={debtsReportData.entries} />;
}

export default function DebtsReportPage() {
  return (
    <div className="flex flex-col gap-6">
        <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
            <DebtsReportContainer />
        </Suspense>
    </div>
  );
}
