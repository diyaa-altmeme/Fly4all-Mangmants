
"use client";

import * as React from 'react';
import type { Client } from '@/lib/types';
import AddClientDialog from './add-client-dialog';
import ClientsTable from './clients-table';

interface ClientsContentProps {
    initialClients: Client[];
    companyGroups: { id: string; name: string }[];
    onDataChanged: () => void;
}

export default function ClientsContent({ initialClients, companyGroups, onDataChanged }: ClientsContentProps) {
    const [clients, setClients] = React.useState(initialClients);

    React.useEffect(() => {
        setClients(initialClients);
    }, [initialClients]);
    

    return (
        <div className="space-y-4">
             <div className="flex justify-end">
                 <AddClientDialog onClientAdded={onDataChanged} />
            </div>
            <ClientsTable
                data={clients}
                companyGroups={companyGroups}
                onDataChanged={onDataChanged}
            />
        </div>
    );
}

