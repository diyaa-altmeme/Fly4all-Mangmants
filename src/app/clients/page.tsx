
"use client";

import * as React from "react";
import type { Client, RelationSection, CompanyPaymentType } from '@/lib/types';
import { getClients } from "@/app/relations/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import { getSettings } from "@/app/settings/actions";
import ClientsContent from "./components/clients-content";
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSearchParams } from 'next/navigation';
import ProtectedPage from "@/components/auth/protected-page";

function ClientsDataContainer() {
    const searchParams = useSearchParams();
    const [relations, setRelations] = React.useState<Client[]>([]);
    const [totalRelations, setTotalRelations] = React.useState(0);
    const [relationSections, setRelationSections] = React.useState<RelationSection[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '15');
    const searchTerm = searchParams.get('search') as string | undefined;
    const relationType = searchParams.get('relationType') as string | undefined;
    const paymentType = searchParams.get('paymentType') as CompanyPaymentType | undefined;
    const status = searchParams.get('status') as 'active' | 'inactive' | undefined;
    const country = searchParams.get('country') as string | undefined;
    const province = searchParams.get('province') as string | undefined;
    const sortBy = searchParams.get('sortBy') as string | undefined;

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [clientsResponse, settings] = await Promise.all([
                    getClients({
                        page, limit, searchTerm, relationType, paymentType, status, country, province, sortBy
                    }),
                    getSettings(),
                ]);
                setRelations(clientsResponse.clients);
                setTotalRelations(clientsResponse.total);
                setRelationSections(settings.relationSections || []);
            } catch (e: any) {
                setError(e.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [page, limit, searchTerm, relationType, paymentType, status, country, province, sortBy]);

    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
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
        <ClientsContent
            initialRelations={relations}
            totalRelations={totalRelations}
            relationSections={relationSections}
        />
    );
}

export default function ClientsPage() {
    return (
        <ProtectedPage permission="relations:read">
            <div className="space-y-6">
                <div className="px-0 sm:px-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة العلاقات</h1>
                    <p className="text-muted-foreground">إدارة جميع العملاء والموردين في مكان واحد.</p>
                </div>
                <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                    <ClientsDataContainer />
                </Suspense>
            </div>
        </ProtectedPage>
    );
}
