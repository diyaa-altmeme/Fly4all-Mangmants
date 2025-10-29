
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import AdvancedAccountsData from "./components/advanced-accounts-data";

export default async function AdvancedAccountsSetupPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
      <AdvancedAccountsData />
    </Suspense>
  );
}
