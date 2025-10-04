
import * as React from "react";
import BookingsContent from "./components/bookings-content";
import { getBookings } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import type { BookingEntry } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

async function BookingsDataContainer({ page, limit }: { page: number, limit: number }) {
    const [{ bookings, total }, error] = await getBookings({ page, limit })
        .then(res => [res, null])
        .catch(e => [{ bookings: [], total: 0 }, e.message || "فشل تحميل البيانات"]);

    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل البيانات الضرورية لهذه الصفحة."}</AlertDescription>
            </Alert>
        );
    }
    
    const bookingEntries = bookings.map(b => b.originalData as BookingEntry);

    return (
        <BookingsContent
            initialData={bookingEntries}
            totalBookings={total}
        />
    );
}

export default async function BookingsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const page = Number(searchParams?.['page'] ?? '1');
    const limit = Number(searchParams?.['limit'] ?? '15');

    return (
        <Card>
            <CardHeader className="text-right">
                <CardTitle>إدارة الحجوزات والعمليات</CardTitle>
                <CardDescription>
                    إدارة شاملة لجميع الحجوزات وعمليات التذاكر (إصدار، تغيير، استرجاع، إلغاء) في مكان واحد.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                    <BookingsDataContainer
                        page={page}
                        limit={limit}
                    />
                </Suspense>
            </CardContent>
        </Card>
    )
}