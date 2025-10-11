
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFlightReports, runAdvancedFlightAudit } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import FlightAnalysisContent from './components/flight-analysis-content';


export const dynamic = 'force-dynamic';

export default async function FlightAnalysisPage() {
    const [reports, error] = await Promise.all([
      runAdvancedFlightAudit(),
    ]).then(res => [res[0], null]).catch(e => [null, e.message]);
    
    if(error || !reports) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل البيانات"}</AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <FlightAnalysisContent
                initialReports={reports}
            />
        </div>
    );
}

