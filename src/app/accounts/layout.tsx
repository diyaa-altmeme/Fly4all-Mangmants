import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import AccountsNavTabs from "./components/accounts-nav-tabs";

export default function AccountsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
        <AccountsNavTabs />
        <Separator />
        <div className="pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
