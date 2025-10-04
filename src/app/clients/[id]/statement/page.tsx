"use client";

import React, { Suspense } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function Redirector() {
    const params = useParams();
    const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
    const router = useRouter();
    useEffect(() => {
        if(clientId) {
             router.replace(`/reports/account-statement?accountId=${clientId}`);
        }
    }, [clientId, router]);
    return null;
}

export default function ClientAccountStatementPage() {
    return (
        <Suspense>
            <Redirector />
        </Suspense>
    );
}
