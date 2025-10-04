
"use client";

import * as React from "react";
import VisasContent from "./components/visas-content";
import { getVisaBookings } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import type { VisaBookingEntry, Client, Supplier, Box } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function VisasPage() {
    const [bookings, setBookings] = React.useState<VisaBookingEntry[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getVisaBookings();
                setBookings(data);
            } catch (e: any) {
                setError(e.message || "فشل تحميل البيانات الضرورية لهذه الصفحة.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }
    
  return (
      <Card>
            <CardHeader className="text-right">
                <CardTitle>إدارة طلبات الفيزا</CardTitle>
                <CardDescription>
                    نظام متكامل لتسجيل ومتابعة جميع طلبات الفيزا وحالاتها.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <VisasContent
                    initialData={bookings}
                />
            </CardContent>
        </Card>
  );
}
