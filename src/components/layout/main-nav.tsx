"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { Permission } from "@/lib/types";
import {
  Home, Activity, Wallet, Briefcase, BarChart3, Users, Settings,
  Ticket, CreditCard, ArrowRightLeft, Package, Boxes, ListChecks,
  GitBranch, HelpCircle, AreaChart, BarChart2, Plane, Milestone,
  Users2, Send, MessageSquare, Network, ShieldCheck, Paintbrush,
  FileImage, DatabaseZap, Brain, ScanSearch, FileUp, History, FileWarning, Trash2
} from "lucide-react";

const NavMenu = ({
  label,
  icon: Icon,
  children,
  activeRoutes,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  activeRoutes: string[];
}) => {
  const pathname = usePathname();
  const isActive = activeRoutes.some((r) => pathname.startsWith(r));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap"
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {label}
            <Icon className="h-4 w-4" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      {/* مهم للـ RTL: align=“end” و side=“bottom” والـ SubContent يفتح للـ right */}
      <DropdownMenuContent align="end" side="bottom" dir="rtl">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Item = ({ href, label, icon: Icon }: any) => (
  <DropdownMenuItem asChild>
    <Link href={href} className="w-full justify-between flex items-center">
      <span>{label}</span>
      <Icon className="h-4 w-4 ms-2" />
    </Link>
  </DropdownMenuItem>
);

const Sub = ({ label, icon: Icon, children }: any) => (
  <DropdownMenuSub>
    <DropdownMenuSubTrigger className="justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
    </DropdownMenuSubTrigger>
    {/* يفتح لليمين في RTL */}
    <DropdownMenuSubContent sideOffset={8} alignOffset={-5} dir="rtl">
      {children}
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

export function MainNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const menus = useMemo(() => {
    const can = (p?: Permission) => (!p ? true : hasPermission(p));

    return [
      {
        id: "home",
        node: (
          <Link
            key="home"
            href="/dashboard"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-bold hover:bg-muted",
              pathname === "/dashboard" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              الرئيسية <Home className="h-4 w-4" />
            </span>
          </Link>
        ),
      },
      {
        id: "ops",
        show: true,
        node: (
          <NavMenu
            key="ops"
            label="العمليات"
            icon={Activity}
            activeRoutes={["/bookings", "/visas", "/accounts/remittances"]}
          >
            {can("bookings:read") && (
              <Item href="/bookings" label="حجوزات الطيران" icon={Ticket} />
            )}
            {can("visas:read") && (
              <Item href="/visas" label="حجوزات الفيزا" icon={CreditCard} />
            )}
            {can("remittances:read") && (
              <Item
                href="/accounts/remittances"
                label="الحوالات"
                icon={ArrowRightLeft}
              />
            )}
            {can("admin") && (
              <Item
                href="/bookings/fly-changes"
                label="تغييرات فلاي والوزن"
                icon={Package}
              />
            )}
          </NavMenu>
        ),
      },
      {
        id: "accounting",
        show: true,
        node: (
          <NavMenu
            key="acc"
            label="المحاسبة"
            icon={Wallet}
            activeRoutes={[
              "/accounts/vouchers",
              "/boxes",
              "/reconciliation",
              "/reports/debts",
              "/reports/profit-loss",
              "/reports/boxes",
              "/reports/cash-flow",
              "/reports/profitability-analysis",
              "/settings/accounting",
              "/settings/advanced-accounts-setup",
            ]}
          >
            {can("vouchers:read") && (
              <Item
                href="/accounts/vouchers/list"
                label="سجل السندات"
                icon={ListChecks}
              />
            )}
            {can("boxes:read") && (
              <Item href="/boxes" label="الصناديق" icon={Boxes} />
            )}
            {can("admin") && (
              <Item
                href="/settings/advanced-accounts-setup"
                label="الدليل المحاسبي"
                icon={GitBranch}
              />
            )}
            {can("admin") && (
              <Item
                href="/reconciliation"
                label="التدقيق الذكي"
                icon={HelpCircle}
              />
            )}

            {(can("reports:debts") ||
              can("reports:profits") ||
              can("admin")) && (
              <>
                <DropdownMenuSeparator />
                <Sub label="مركز التقارير المحاسبية" icon={AreaChart}>
                  {can("reports:debts") && (
                    <Item
                      href="/reports/debts"
                      label="تقرير الأرصدة"
                      icon={Wallet}
                    />
                  )}
                  {can("reports:profits") && (
                    <Item
                      href="/reports/profit-loss"
                      label="الأرباح والخسائر"
                      icon={BarChart2}
                    />
                  )}
                  {can("reports:debts") && (
                    <Item
                      href="/reports/cash-flow"
                      label="تقرير التدفق النقدي"
                      icon={ArrowRightLeft}
                    />
                  )}
                  {can("admin") && (
                    <Item
                      href="/reports/boxes"
                      label="تقرير الصناديق"
                      icon={Boxes}
                    />
                  )}
                </Sub>
              </>
            )}
          </NavMenu>
        ),
      },
      {
        id: "custom",
        show: true,
        node: (
          <NavMenu
            key="custom"
            label="الأعمال المخصصة"
            icon={Briefcase}
            activeRoutes={["/subscriptions", "/segments", "/exchanges", "/profit-sharing"]}
          >
            <DropdownMenuLabel className="text-right">
              الوحدات التجارية الأساسية
            </DropdownMenuLabel>
            {can("subscriptions:read") && (
              <Item href="/subscriptions" label="الاشتراكات" icon={Repeat} />
            )}
            {can("segments:read") && (
              <Item href="/segments" label="السكمنت" icon={Layers3} />
            )}
            {can("admin") && (
              <Item
                href="/exchanges"
                label="إدارة البورصات"
                icon={ChevronsRightLeft}
              />
            )}
            {can("admin") && (
              <Item
                href="/profit-sharing"
                label="توزيع الحصص"
                icon={Share2}
              />
            )}
          </NavMenu>
        ),
      },
      {
        id: "reports",
        show: true,
        node: (
          <NavMenu
            key="reports"
            label="التقارير"
            icon={BarChart3}
            activeRoutes={["/reports"]}
          >
            <Item
              href="/reports/account-statement"
              label="كشف الحساب المتقدم"
              icon={FileText}
            />
            <Item
              href="/reports/flight-analysis"
              label="تحليل الرحلات"
              icon={Plane}
            />
            <Item href="/reports" label="تقارير متقدمة" icon={Milestone} />
          </NavMenu>
        ),
      },
      {
        id: "relations",
        show: true,
        node: (
          <NavMenu
            key="relations"
            label="العلاقات"
            icon={Users}
            activeRoutes={["/clients", "/suppliers", "/campaigns", "/chat"]}
          >
            <Item
              href="/clients"
              label="إدارة العلاقات"
              icon={Users2}
            />
            <DropdownMenuSeparator />
            <Item href="/campaigns" label="الحملات" icon={Send} />
            <Item href="/chat" label="المحادثات" icon={MessageSquare} />
          </NavMenu>
        ),
      },
      {
        id: "settings",
        show: true,
        node: (
          <NavMenu
            key="settings"
            label="الإعدادات والأدوات"
            icon={Settings}
            activeRoutes={["/settings", "/users", "/system", "/templates", "/finance-tools"]}
          >
            <Item href="/settings" label="الإعدادات العامة" icon={Settings} />
            <Sub label="إدارة النظام" icon={Network}>
              <Item href="/users" label="الموظفين والصلاحيات" icon={Users} />
              <Item
                href="/settings/client-permissions"
                label="صلاحيات العملاء"
                icon={ShieldCheck}
              />
              <Item
                href="/settings/themes"
                label="المظهر"
                icon={Paintbrush}
              />
              <Item href="/templates" label="قوالب الرسائل" icon={FileImage} />
            </Sub>
            <Sub label="أدوات النظام" icon={Milestone}>
              <Item
                href="/finance-tools"
                label="أدوات مالية متقدمة"
                icon={DatabaseZap}
              />
              <Item
                href="/finance-tools/ai-audit"
                label="التحليل الذكي المالي"
                icon={Brain}
              />
              <Item
                href="/system/data-audit"
                label="فحص البيانات"
                icon={ScanSearch}
              />
              <Item
                href="/relations/settings/import"
                label="استيراد البيانات"
                icon={FileUp}
              />
            </Sub>
            <Sub label="سجلات النظام" icon={History}>
              <Item
                href="/system/activity-log"
                label="سجل النشاطات"
                icon={History}
              />
              <Item
                href="/system/error-log"
                label="سجل الأخطاء"
                icon={FileWarning}
              />
              <Item
                href="/system/deleted-log"
                label="سجل المحذوفات"
                icon={Trash2}
              />
            </Sub>
          </NavMenu>
        ),
      },
    ].filter((m) => m.show !== false);
  }, [pathname, hasPermission]);

  return (
    <nav className="flex items-center gap-1 py-2">
      {menus.map((m) => (
        <div key={m.id}>{m.node}</div>
      ))}
    </nav>
  );
}
