

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FlyChangesContent from './components/fly-changes-content';
import { getFlyChangesAndBaggage } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';


export default async function FlyChangesPage() {
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
                    <FlyChangesContent 
                        initialData={data || []}
                        clients={clientsResponse.clients}
                        suppliers={suppliers}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
