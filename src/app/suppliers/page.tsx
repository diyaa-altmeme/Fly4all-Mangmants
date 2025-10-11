
"use client";

import * as React from 'react';
import { getSuppliers } from './actions';
import { getCompanyGroups, getWorkTypes } from '@/app/relations/settings/actions';
import type { Supplier, CompanyGroup, WorkType } from '@/lib/types';
import SuppliersContent from '@/components/clients/components/suppliers-content';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

function SuppliersPageContainer() {
    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
    const [groups, setGroups] = React.useState<CompanyGroup[]>([]);
    const [workTypes, setWorkTypes] = React.useState<WorkType[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [suppliersData, groupsData, workTypesData] = await Promise.all([
                getSuppliers({ all: true }),
                getCompanyGroups(),
                getWorkTypes()
            ]);
            setSuppliers(suppliersData);
            setGroups(groupsData);
            setWorkTypes(workTypesData);
        } catch (e: any) {
            setError(e.message || "Failed to load data.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

     if (loading) {
        return <Skeleton className="h-[400px] w-full" />;
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
        <SuppliersContent 
            initialSuppliers={suppliers}
            companyGroups={groups}
            workTypes={workTypes}
            onDataChanged={fetchData}
        />
    )
}

export default function SuppliersPage() {
    return <SuppliersPageContainer />;
}
