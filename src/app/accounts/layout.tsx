import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import AccountsNavTabs from "./components/accounts-nav-tabs";

export default function AccountsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full space-y-4">
      <div className="px-4 sm:px-6">
        <AccountsNavTabs />
      </div>
      <Separator />
      <div className="px-4 sm:px-6 pb-8">
        {children}
      </div>
    </div>
  );
}
