
"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Repeat, Layers3, ChevronsRightLeft, Share2,
  ChevronDown, PlusCircle, FileDown, BookUser, Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

// Dialogs
import NewStandardReceiptDialog from "@/app/accounts/vouchers/components/new-standard-receipt-dialog";
import NewDistributedReceiptDialog from "@/components/vouchers/components/new-distributed-receipt-dialog";
import NewPaymentVoucherDialog from "@/components/vouchers/components/new-payment-voucher-dialog";
import NewExpenseVoucherDialog from "@/components/vouchers/components/new-expense-voucher-dialog";
import NewJournalVoucherDialog from "@/components/vouchers/components/new-journal-voucher-dialog";
import AddClientDialog from "@/app/clients/components/add-client-dialog";


const NavLink = ({ href, children, active, className }: { href: string; children: React.ReactNode, active: boolean, className?: string }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all whitespace-nowrap font-bold justify-end",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted",
        className
      )}
    >
        {children}
    </Link>
);

const CreateNewOperationMenuItems = () => {
  const { hasPermission } = useAuth();
  if (!hasPermission('bookings:create') && !hasPermission('visas:create')) return null;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="justify-between"><span>إضافة عملية</span><PlusCircle className="h-4 w-4 ml-2" /></DropdownMenuSubTrigger>
      <DropdownMenuSubContent side="right" align="start">
        {hasPermission('bookings:create') && <DropdownMenuItem asChild><Link href="/bookings" className="justify-between w-full"><span>حجز طيران جديد</span><Ticket className="h-4 w-4 ml-2" /></Link></DropdownMenuItem>}
        {hasPermission('visas:create') && <DropdownMenuItem asChild><Link href="/visas" className="justify-between w-full"><span>حجز فيزا جديد</span><CreditCard className="h-4 w-4 ml-2" /></Link></DropdownMenuItem>}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

const CreateVoucherMenuItems = ({ isMobile = false }: { isMobile?: boolean }) => {
    const router = useRouter();
    const onDataChanged = () => router.refresh();

    const menuItems = [
        { href: "/accounts/vouchers/list", label: "سجل السندات", icon: ListChecks },
        { href: "/settings", label: "الإعدادات", icon: Settings }
    ];

    if (isMobile) {
        return (
            <div className="flex flex-col gap-1">
                <Dialog modal={false}><NewStandardReceiptDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند قبض عادي</span><FileDown className="h-4 w-4" /></button></DialogTrigger></NewStandardReceiptDialog></Dialog>
                <Dialog modal={false}><NewDistributedReceiptDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند قبض مخصص</span><GitBranch className="h-4 w-4" /></button></DialogTrigger></NewDistributedReceiptDialog></Dialog>
                <Dialog modal={false}><NewPaymentVoucherDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند دفع</span><FileUp className="h-4 w-4" /></button></DialogTrigger></NewPaymentVoucherDialog></Dialog>
                <Dialog modal={false}><NewExpenseVoucherDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند مصاريف</span><Banknote className="h-4 w-4" /></button></DialogTrigger></NewExpenseVoucherDialog></Dialog>
                <Dialog modal={false}><NewJournalVoucherDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند قيد داخلي</span><BookUser className="h-4 w-4" /></button></DialogTrigger></NewJournalVoucherDialog></Dialog>
                <DropdownMenuSeparator />
                 {menuItems.map(item => <MobileSubItem key={item.href} href={item.href} icon={item.icon}>{item.label}</MobileSubItem>)}
            </div>
        );
    }
    

    return (
        <div className="flex flex-col gap-1 p-2">
             <Dialog modal={false}><NewStandardReceiptDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><Button variant="ghost" className="justify-between gap-2 w-full"><span>سند قبض عادي</span><FileDown className="h-4 w-4" /></Button></DialogTrigger></NewStandardReceiptDialog></Dialog>
            <Dialog modal={false}><NewDistributedReceiptDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><Button variant="ghost" className="justify-between gap-2 w-full"><span>سند قبض مخصص</span><GitBranch className="h-4 w-4" /></Button></DialogTrigger></NewDistributedReceiptDialog></Dialog>
            <Dialog modal={false}><NewPaymentVoucherDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><Button variant="ghost" className="justify-between gap-2 w-full"><span>سند دفع</span><FileUp className="h-4 w-4" /></Button></DialogTrigger></NewPaymentVoucherDialog></Dialog>
            <Dialog modal={false}><NewExpenseVoucherDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><Button variant="ghost" className="justify-between gap-2 w-full"><span>سند مصاريف</span><Banknote className="h-4 w-4" /></Button></DialogTrigger></NewExpenseVoucherDialog></Dialog>
            <Dialog modal={false}><NewJournalVoucherDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><Button variant="ghost" className="justify-between gap-2 w-full"><span>سند قيد داخلي</span><BookUser className="h-4 w-4" /></Button></DialogTrigger></NewJournalVoucherDialog></Dialog>
            <DropdownMenuSeparator />
            {menuItems.map(item => (
                    <DropdownMenuItem asChild key={item.href}>
                        <Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4" /></Link>
                    </DropdownMenuItem>
                ))}
        </div>
    )
}

const MobileSubItem = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) => (
    <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end">
        <span>{children}</span>
        <Icon className="h-4 w-4" />
    </Link>
);

const NavMenu = ({ label, icon: Icon, children, activeRoutes }: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  activeRoutes: string[];
}) => {
  const pathname = usePathname();
  const isActive = activeRoutes.some(route => pathname.startsWith(route));

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant={isActive ? 'secondary' : 'ghost'} className={cn(
              "group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors whitespace-nowrap w-full justify-end",
              isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200 group-data-[state=open]:-rotate-180")} />
                {label}
                <Icon className="h-4 w-4" />
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
    {/* يفتح لليمين في RTL */}
    <DropdownMenuSubContent side="right" align="end" dir="rtl">
      {children}
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();

  const handleDataChange = () => router.refresh();
  
  const getVisibleItems = useCallback((items: any[]) => {
    return items.filter(item => {
        if (item.permission === undefined) return true; // Default to visible if no permission is set
        return hasPermission(item.permission as Permission);
    });
  }, [hasPermission]);

  const menuConfig = useMemo(() => {
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
        show: true,
        node: (
          <NavMenu
            key="ops"
            label="العمليات"
            icon={Activity}
            activeRoutes={["/bookings", "/visas", "/accounts/remittances"]}
          >
            {can("bookings:create") && (
              <Item href="/bookings" label="حجوزات الطيران" icon={Ticket} />
            )}
            {can("visas:create") && (
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
              "/reports",
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
      {menuConfig.map((m) => (
        <div key={m.id}>{m.node}</div>
      ))}
    </nav>
  );
}

    