"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, BarChart3, FileText, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    href: "/accounts",
    label: "مركز الحسابات",
    icon: Wallet,
    isActive: (pathname: string) => pathname === "/accounts",
  },
  {
    href: "/accounts/remittances",
    label: "الحوالات",
    icon: ArrowRightLeft,
    isActive: (pathname: string) => pathname.startsWith("/accounts/remittances"),
  },
  {
    href: "/accounts/vouchers",
    label: "السندات",
    icon: FileText,
    isActive: (pathname: string) => pathname.startsWith("/accounts/vouchers"),
  },
  {
    href: "/finance/overview",
    label: "النظرة المالية",
    icon: BarChart3,
    isActive: (pathname: string) => pathname.startsWith("/finance/overview"),
  },
  {
    href: "/settings/accounting",
    label: "الإعدادات المحاسبية",
    icon: Settings,
    isActive: (pathname: string) => pathname.startsWith("/settings/accounting"),
  },
] as const;

export default function AccountsNavTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="التنقل بين صفحات الحسابات" className="flex flex-wrap justify-end gap-2">
      {tabs.map((tab) => {
        const active = tab.isActive(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            )}
          >
            <span className="truncate">{tab.label}</span>
            <tab.icon className="h-4 w-4" />
          </Link>
        );
      })}
    </nav>
  );
}
