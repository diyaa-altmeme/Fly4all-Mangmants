
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FlightChangesContent from '@/app/bookings/fly-changes/components/fly-changes-content';
import { getFlightReports } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { getFlyChangesAndBaggage } from '@/app/bookings/fly-changes/actions';


export default async function FlightAnalysisPage() {
    const [data, clientsResponse, suppliers, error] = await Promise.all([
      getFlyChangesAndBaggage(),
      getClients({all: true}),
      getSuppliers({all: true})
    ]).then(res => [...res, null]).catch(e => [null, null, null, e.message]);
    
    if(error || !data || !clientsResponse || !suppliers) {
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
            <Card>
                <CardHeader>
                    <CardTitle>إدارة تغيرات فلاي والوزن الإضافي</CardTitle>
                    <CardDescription>
                       صفحة مخصصة لإدخال ومراجعة تغيرات التذاكر وشراء الأوزان.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FlightChangesContent 
                        initialData={data || []}
                        clients={clientsResponse.clients}
                        suppliers={suppliers}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
