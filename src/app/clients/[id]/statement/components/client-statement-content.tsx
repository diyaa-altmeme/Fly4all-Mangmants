
"use client";

import React from 'react';
import ReportGenerator from '@/components/reports/report-generator';
import type { Box, Client, Supplier } from '@/lib/types';

interface ClientStatementContentProps {
    client: Client;
    boxes: Box[];
    suppliers: Supplier[];
    clients: Client[];
}

export default function ClientStatementContent({ client, boxes, suppliers, clients }: ClientStatementContentProps) {
    return (
        <div className="space-y-2">
             <ReportGenerator 
                boxes={boxes} 
                clients={clients} 
                suppliers={suppliers} 
                defaultAccountId={client.id}
            />
        </div>
    );
}
