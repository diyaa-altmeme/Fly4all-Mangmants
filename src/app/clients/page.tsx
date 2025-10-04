
import * as React from "react";
import type { Client, RelationSection, CompanyPaymentType } from '@/lib/types';
import { getClients } from "@/app/relations/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { getSettings } from "@/app/settings/actions";
import ClientsContent from "./components/clients-content";
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

async function ClientsDataContainer({ page, limit, searchTerm, relationType, paymentType, status, country, province, sortBy }: {
    page: number;
    limit: number;
    searchTerm?: string;
    relationType?: string;
    paymentType?: CompanyPaymentType;
    status?: 'active' | 'inactive';
    country?: string;
    province?: string;
    sortBy?: string;
}) {
    const [clientsResponse, settings, error] = await Promise.all([
        getClients({ 
            page, 
            limit, 
            searchTerm,
            relationType: relationType !== 'all' ? relationType : undefined,
            paymentType: paymentType !== 'all' ? paymentType : undefined,
            status: status !== 'all' ? status : undefined,
            country: country !== 'all' ? country : undefined,
            province: province !== 'all' ? province : undefined,
            sortBy: sortBy,
        }),
        getSettings(),
    ]).then(res => [...res, null]).catch(e => [null, null, e.message || "Failed to load data"]);

    if (error || !clientsResponse || !settings) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل البيانات"}</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <ClientsContent
            initialRelations={clientsResponse.clients}
            totalRelations={clientsResponse.total}
            relationSections={settings.relationSections || []}
        />
    );
}

export default async function ClientsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const page = Number(searchParams?.['page'] ?? '1');
    const limit = Number(searchParams?.['limit'] ?? '15');
    const searchTerm = searchParams?.['search'] as string | undefined;
    const relationType = searchParams?.['relationType'] as string | undefined;
    const paymentType = searchParams?.['paymentType'] as CompanyPaymentType | undefined;
    const status = searchParams?.['status'] as 'active' | 'inactive' | undefined;
    const country = searchParams?.['country'] as string | undefined;
    const province = searchParams?.['province'] as string | undefined;
    const sortBy = searchParams?.['sortBy'] as string | undefined;

    return (
        <div className="flex flex-col gap-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <ClientsDataContainer 
                    page={page} 
                    limit={limit}
                    searchTerm={searchTerm}
                    relationType={relationType}
                    paymentType={paymentType}
                    status={status}
                    country={country}
                    province={province}
                    sortBy={sortBy}
                />
            </Suspense>
        </div>
    );
}
