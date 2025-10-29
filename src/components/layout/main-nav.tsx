
"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  FileImage, DatabaseZap, Brain, ScanSearch, FileUp, History, FileWarning, Trash2,
  Repeat, Layers3, ChevronsRightLeft, Share2, FileText, ChevronDown
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
    <DropdownMenuSubContent side="right" align="end" dir="rtl">
      {children}
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

export function MainNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  
  const getVisibleItems = useCallback((items: any[]) => {
    return items.filter(item => {
        if (!item.permission) return true;
        return hasPermission(item.permission as Permission);
    });
  }, [hasPermission]);

  const menus = useMemo(() => {
    const can = (p?: Permission) => (!p ? true : hasPermission(p));

    const allMenus = [
      {
        id: "home",
        node: (
          <Link
            key="home"
            href="/dashboard"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-bold hover:bg-muted",
              pathname === "/dashboard" && "bg-primary text-primary-foreground"
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
        label: "العمليات",
        icon: Activity,
        activeRoutes: ["/bookings", "/visas", "/accounts/remittances"],
        items: [
          { href: "/bookings", label: "حجوزات الطيران", icon: Ticket, permission: 'bookings:read' },
          { href: "/visas", label: "حجوزات الفيزا", icon: CreditCard, permission: 'visas:read' },
          { href: "/accounts/remittances", label: "الحوالات", icon: ArrowRightLeft, permission: 'remittances:read' },
          { href: "/bookings/fly-changes", label: "تغييرات فلاي والوزن", icon: Package, permission: 'admin' },
        ]
      },
      {
        id: "accounting",
        label: "المحاسبة",
        icon: Wallet,
        activeRoutes: [
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
        ],
        items: [
          { href: "/accounts/vouchers/list", label: "سجل السندات", icon: ListChecks, permission: 'vouchers:read' },
          { href: "/boxes", label: "الصناديق", icon: Boxes, permission: 'boxes:read' },
          { href: "/settings/advanced-accounts-setup", label: "الدليل المحاسبي", icon: GitBranch, permission: 'admin' },
          { href: "/reconciliation", label: "التدقيق الذكي", icon: HelpCircle, permission: 'admin' },
          { isSeparator: true, permission: 'reports:debts' },
          { 
            label: 'مركز التقارير المحاسبية', icon: AreaChart, permission: 'reports:debts', subItems: [
              { href: "/reports/debts", label: "تقرير الأرصدة", icon: Wallet, permission: 'reports:debts' },
              { href: "/reports/profit-loss", label: "الأرباح والخسائر", icon: AreaChart, permission: 'reports:profits' },
              { href: "/reports/cash-flow", label: "تقرير التدفق النقدي", icon: ArrowRightLeft, permission: 'reports:debts' },
              { href: "/reports/profitability-analysis", label: "تحليل الربحية", icon: BarChart2, permission: 'reports:debts' },
              { href: "/reports/boxes", label: "تقرير الصناديق", icon: Boxes, permission: 'admin' },
            ]
          },
        ]
      },
      {
        id: "custom",
        label: "الأعمال المخصصة",
        icon: Briefcase,
        activeRoutes: ["/subscriptions", "/segments", "/exchanges", "/profit-sharing"],
        items: [
            { isLabel: true, label: "الوحدات التجارية الأساسية", permission: 'public' },
            { href: "/subscriptions", label: "الاشتراكات", icon: Repeat, permission: 'subscriptions:read' },
            { href: "/segments", label: "السكمنت", icon: Layers3, permission: 'segments:read' },
            { href: "/exchanges", label: "إدارة البورصات", icon: ChevronsRightLeft, permission: 'admin' },
            { href: "/profit-sharing", label: "توزيع الحصص", icon: Share2, permission: 'admin' },
        ]
    },
      {
        id: "reports",
        label: "التقارير",
        icon: BarChart3,
        activeRoutes: ["/reports"],
        items: [
          { href: "/reports/account-statement", label: "كشف الحساب المتقدم", icon: FileText, permission: 'reports:account_statement' },
          { href: "/reports/flight-analysis", label: "تحليل الرحلات", icon: Plane, permission: 'reports:flight_analysis' },
          { href: "/reports", label: "تقارير متقدمة", icon: Milestone, permission: 'reports:read:all' },
        ]
      },
      {
        id: "relations",
        label: "العلاقات",
        icon: Users,
        activeRoutes: ["/clients", "/suppliers", "/campaigns", "/chat"],
        items: [
            { href: "/clients", label: "إدارة العلاقات", icon: Users2, permission: 'relations:read' },
            { isSeparator: true, permission: 'relations:read' },
            { href: "/campaigns", label: "الحملات", icon: Send, permission: 'campaigns:read' },
            { href: "/chat", label: "المحادثات", icon: MessageSquare, permission: 'chat:read' },
        ]
      },
      {
        id: "settings",
        label: "الإعدادات والأدوات",
        icon: Settings,
        activeRoutes: ["/settings", "/users", "/system", "/templates", "/finance-tools"],
        items: [
          { href: "/settings", label: "الإعدادات العامة", icon: Settings, permission: 'admin' },
          { 
            label: 'إدارة النظام', icon: Network, permission: 'admin', subItems: [
              { href: "/users", label: "الموظفين والصلاحيات", icon: Users, permission: 'users:read' },
              { href: "/settings/client-permissions", label: "صلاحيات العملاء", icon: ShieldCheck, permission: 'admin' },
              { href: "/settings/themes", label: "المظهر", icon: Paintbrush, permission: 'settings:update' },
              { href: "/templates", label: "قوالب الرسائل", icon: FileImage, permission: 'admin' },
            ]
          },
          {
            label: 'أدوات النظام', icon: Milestone, permission: 'admin', subItems: [
              { href: "/finance-tools", label: "أدوات مالية متقدمة", icon: DatabaseZap, permission: 'admin' },
              { href: "/finance-tools/ai-audit", label: "التحليل الذكي المالي", icon: Brain, permission: 'admin' },
              { href: "/system/data-audit", label: "فحص البيانات", icon: ScanSearch, permission: 'system:data_audit:run' },
              { href: "/relations/settings/import", label: "استيراد البيانات", icon: FileUp, permission: 'admin' },
            ]
          },
          {
            label: 'سجلات النظام', icon: History, permission: 'admin', subItems: [
                { href: "/system/activity-log", label: "سجل النشاطات", icon: History, permission: 'system:audit_log:read' },
                { href: "/system/error-log", label: "سجل الأخطاء", icon: FileWarning, permission: 'system:error_log:read' },
                { href: "/system/deleted-log", label: "سجل المحذوفات", icon: Trash2, permission: 'admin' },
            ]
          },
        ]
      },
    ];

    return allMenus
      .map(menu => ({
        ...menu,
        items: menu.items ? getVisibleItems(menu.items) : [],
      }))
      .filter(menu => menu.node || (menu.items && menu.items.length > 0));

  }, [pathname, hasPermission, getVisibleItems]);

  const renderMenuItems = (items: any[]) => {
    return items.map((item, index) => {
        if (item.isLabel) return <DropdownMenuLabel key={`label-${index}`} className="text-right">{item.label}</DropdownMenuLabel>;
        if (item.isSeparator) return <DropdownMenuSeparator key={`sep-${index}`} />;
        if (item.component) return React.cloneElement(item.component, { key: `comp-${index}` });
        if (item.subItems) {
            const visibleSubItems = getVisibleItems(item.subItems);
            if (visibleSubItems.length === 0) return null;
            return (
                <Sub key={item.label} label={item.label} icon={item.icon}>
                    {renderMenuItems(visibleSubItems)}
                </Sub>
            );
        }
        return (
            <Item href={item.href} label={item.label} icon={item.icon} key={item.href} />
        );
    });
  };

  return (
    <nav className="flex items-center gap-1 py-2">
      {menus.map((m) => {
        if(m.node) return <div key={m.id}>{m.node}</div>;
        return (
          <NavMenu
            key={m.id}
            label={m.label}
            icon={m.icon}
            activeRoutes={m.activeRoutes}
          >
            {renderMenuItems(m.items)}
          </NavMenu>
        );
      })}
    </nav>
  );
}
