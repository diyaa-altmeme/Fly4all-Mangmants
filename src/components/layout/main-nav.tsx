// This file is deprecated. Navigation logic is now in main-nav-responsive.tsx and main-nav-content.tsx.
// For safety, we'll keep it but it should be removed later.
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Currency } from '@/lib/types';
import NewStandardReceiptForm from '@/app/accounts/vouchers/components/new-standard-receipt-form';
import { cn } from '@/lib/utils';
import { Settings2, Loader2 } from 'lucide-react';
import { useVoucherNav } from '@/context/voucher-nav-context';
import VoucherDialogSettings from '@/components/vouchers/components/voucher-dialog-settings';
import {
    LayoutDashboard,
    Settings,
    ChevronDown,
    BookCopy,
    ArrowRightLeft,
    BarChart3,
    Layers3,
    Repeat,
    Users,
    Boxes,
    FileUp,
    ShieldCheck,
    CreditCard,
    Ticket,
    FileCog,
    Network,
    Plane,
    GitBranch,
    ArrowUpRight,
    ArrowDownLeft,
    Banknote,
    BookUser,
    ListChecks,
    FileText,
    PlusCircle,
    Users2,
    ImageIcon,
    Contact,
    Store,
    ChevronsRightLeft,
    FileDown,
    Share2,
    AreaChart,
    Calculator,
    Wand2,
    Lightbulb,
    Package,
    Wallet,
    MessageSquare,
    Briefcase,
    History,
    FileImage,
    HelpCircle,
    Building,
    FileBarChart,
    FileSpreadsheet,
    Menu,
    AlertTriangle,
    FileWarning,
    ScanSearch,
    Paintbrush,
    Send,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import NewDistributedReceiptDialog from "@/components/vouchers/components/new-distributed-receipt-dialog";
import NewPaymentVoucherDialog from "@/components/vouchers/components/new-payment-voucher-dialog";
import NewExpenseVoucherDialog from "@/components/vouchers/components/new-expense-voucher-dialog";
import NewJournalVoucherDialog from "@/components/vouchers/components/new-journal-voucher-dialog";
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import { DropdownMenuSeparator, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/auth-context';
import type { Permission } from '@/lib/types';
import { PERMISSIONS } from '@/lib/permissions';


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


const operationsItems = [
    { href: "/bookings", label: "حجوزات الطيران", icon: Ticket, permission: 'bookings:read' },
    { href: "/visas", label: "حجوزات الفيزا", icon: CreditCard, permission: 'visas:read' },
    { href: "/accounts/remittances", label: "الحوالات", icon: ArrowRightLeft, permission: 'remittances:read' },
    { href: "/bookings/fly-changes", label: "تغييرات فلاي والوزن", icon: Package, permission: 'admin' },
];

const customReportsItems = [
    { href: "/subscriptions", label: "الاشتراكات", icon: Repeat, permission: 'subscriptions:read' },
    { href: "/segments", label: "السكمنت", icon: Layers3, permission: 'segments:read' },
    { href: "/exchanges", label: "البورصات", icon: ChevronsRightLeft, permission: 'admin' },
    { href: "/profit-sharing", label: "توزيع الحصص", icon: Share2, permission: 'admin' },
    { href: "/reports/flight-analysis", label: "تحليل بيانات الطيران", icon: Plane, permission: 'reports:flight_analysis' },
];

const reportsItems = [
    { href: "/reports/debts", label: "تقرير الأرصدة", icon: Wallet, permission: 'reports:debts' },
    { href: "/reports/account-statement", label: "كشف حساب", icon: FileText, permission: 'reports:account_statement' },
    { href: "/finance/overview", label: "المالية الموحدة", icon: FileBarChart, permission: 'admin' },
    { href: "/profits", label: "الأرباح الشهرية", icon: BarChart3, permission: 'reports:profits' },
    { href: "/reconciliation", label: "التدقيق الذكي", icon: Wand2, permission: 'admin' },
    { href: "/reports/advanced", label: "تقارير متقدمة", icon: AreaChart, permission: 'reports:read:all' },
];

const systemItems = [
    { href: "/settings", label: "الإعدادات العامة", icon: Settings, permission: 'settings:read' },
    { href: "/settings/themes", label: "المظهر", icon: Paintbrush, permission: 'settings:update' },
    { href: "/users", label: "الموظفين والصلاحيات", icon: Users, permission: 'users:read' },
    { href: "/boxes", label: "الصناديق", icon: Boxes, permission: 'admin' },
    { href: "/templates", label: "قوالب الرسائل", icon: FileImage, permission: 'admin' },
    { href: "/system/activity-log", label: "سجل النشاطات", icon: History, permission: 'system:audit_log:read' },
    { href: "/system/error-log", label: "سجل الأخطاء", icon: FileWarning, permission: 'system:error_log:read' },
    { href: "/system/data-audit", label: "فحص البيانات", icon: ScanSearch, permission: 'system:data_audit:run' },
    { href: "/system/deleted-log", label: "سجل المحذوفات", icon: History, permission: 'admin' }, // Placeholder for sub-menu
    { href: "/support", label: "الدعم والمساعدة", icon: HelpCircle, permission: 'public' },
    { href: "/coming-soon", label: "الميزات القادمة", icon: Lightbulb, permission: 'public' },
];

const deletedItemsLog = [
    { href: "/bookings/deleted-bookings", label: "سجلات الحجوزات", icon: Ticket },
    { href: "/subscriptions/deleted-subscriptions", label: "سجلات الاشتراكات", icon: Repeat },
    { href: "/segments/deleted-segments", label: "سجلات السكمنت", icon: Layers3 },
]

const additionalServicesItems = [
    { href: "/chat", label: "المحادثات", icon: MessageSquare, permission: 'public' },
    { href: "/campaigns", label: "الحملات", icon: Send, permission: 'admin' },
];

const MobileSubItem = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) => (
    <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end">
        <span>{children}</span>
        <Icon className="h-4 w-4" />
    </Link>
);


const CreateVoucherMenuItems = ({ isMobile = false }: { isMobile?: boolean }) => {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const onDataChanged = () => router.refresh();

    const menuItems = [
        { href: "/accounts/vouchers/list", label: "سجل السندات", icon: ListChecks, permission: 'vouchers:read' },
        { href: "/settings/accounting", label: "الدليل المحاسبي", icon: GitBranch, permission: 'settings:read'},
        { href: "/settings", label: "الإعدادات", icon: Settings, permission: 'settings:read' }
    ];
    
    const visibleMenuItems = menuItems.filter(item => hasPermission(item.permission as Permission));
    const canCreate = hasPermission('vouchers:create');

    const MobileButtonWrapper = ({ DialogComponent, label, Icon }: { DialogComponent: React.ElementType, label: string, Icon: React.ElementType }) => (
        <DialogComponent onVoucherAdded={onDataChanged}>
            <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full">
                <span>{label}</span><Icon className="h-4 w-4" />
            </button>
        </DialogComponent>
    );

    const DesktopButtonWrapper = ({ DialogComponent, label, Icon }: { DialogComponent: React.ElementType, label: string, Icon: React.ElementType }) => (
        <DialogComponent onVoucherAdded={onDataChanged}>
            <Button variant="ghost" className="justify-between gap-2 w-full">
                <span>{label}</span><Icon className="h-4 w-4" />
            </Button>
        </DialogComponent>
    );

    if (isMobile) {
        return (
            <div className="flex flex-col gap-1">
                {canCreate && (
                    <>
                        <MobileButtonWrapper DialogComponent={NewStandardReceiptDialog} label="سند قبض عادي" Icon={FileDown} />
                        <MobileButtonWrapper DialogComponent={NewDistributedReceiptDialog} label="سند قبض مخصص" Icon={GitBranch} />
                        <MobileButtonWrapper DialogComponent={NewPaymentVoucherDialog} label="سند دفع" Icon={FileUp} />
                        <MobileButtonWrapper DialogComponent={NewExpenseVoucherDialog} label="سند مصاريف" Icon={Banknote} />
                        <MobileButtonWrapper DialogComponent={NewJournalVoucherDialog} label="سند قيد داخلي" Icon={BookUser} />
                    </>
                )}
                {(canCreate && visibleMenuItems.length > 0) && <DropdownMenuSeparator />}
                {visibleMenuItems.map(item => <MobileSubItem key={item.href} href={item.href} icon={item.icon}>{item.label}</MobileSubItem>)}
            </div>
        );
    }
    

    return (
        <div className="flex flex-col gap-1 p-2">
            {canCreate && (
                <>
                    <DesktopButtonWrapper DialogComponent={NewStandardReceiptDialog} label="سند قبض عادي" Icon={FileDown} />
                    <DesktopButtonWrapper DialogComponent={NewDistributedReceiptDialog} label="سند قبض مخصص" Icon={GitBranch} />
                    <DesktopButtonWrapper DialogComponent={NewPaymentVoucherDialog} label="سند دفع" Icon={FileUp} />
                    <DesktopButtonWrapper DialogComponent={NewExpenseVoucherDialog} label="سند مصاريف" Icon={Banknote} />
                    <DesktopButtonWrapper DialogComponent={NewJournalVoucherDialog} label="سند قيد داخلي" Icon={BookUser} />
                </>
            )}
            {(canCreate && visibleMenuItems.length > 0) && <DropdownMenuSeparator />}
            {visibleMenuItems.map(item => (
                <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4" /></Link>
                </DropdownMenuItem>
            ))}
        </div>
    )
}

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
        <DropdownMenuContent>
            {children}
        </DropdownMenuContent>
    </DropdownMenu>
  );
};


export const MainNav = () => {
    return <div />;
}
