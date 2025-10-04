import { redirect } from "next/navigation";
import { Suspense } from "react";

function Redirector({ boxId }: { boxId: string }) {
    redirect(`/reports/account-statement?accountId=${boxId}`);
    return null;
}

// This page now redirects to the new centralized box report page
export default function BoxReportPage({ params }: { params: { id: string } }) {
    return (
        <Suspense>
            <Redirector boxId={params.id} />
        </Suspense>
    );
}
