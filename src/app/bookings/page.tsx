
import * as React from "react";
import BookingsContent from "./components/bookings-content";
import { getBookings } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import type { BookingEntry, JournalVoucher } from "@/lib/types";
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
    
    // The getBookings now returns JournalVoucher[], we extract originalData for the components that expect BookingEntry
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
        <div className="space-y-6">
            <div className="px-0 sm:px-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة الحجوزات والعمليات</h1>
                <p className="text-muted-foreground">
                    إدارة شاملة لجميع الحجوزات وعمليات التذاكر (إصدار، تغيير، استرجاع، إلغاء) في مكان واحد.
                </p>
            </div>
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <BookingsDataContainer
                    page={page}
                    limit={limit}
                />
            </Suspense>
        </div>
    )
}
