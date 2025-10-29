
"use client";

import React, { useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuSub, 
  DropdownMenuSubTrigger, 
  DropdownMenuSubContent,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import NewStandardReceiptDialog from "@/app/accounts/vouchers/components/new-standard-receipt-dialog";
import NewDistributedReceiptDialog from "@/components/vouchers/components/new-distributed-receipt-dialog";
import NewPaymentVoucherDialog from "@/components/vouchers/components/new-payment-voucher-dialog";
import NewExpenseVoucherDialog from "@/components/vouchers/components/new-expense-voucher-dialog";
import NewJournalVoucherDialog from "@/components/vouchers/components/new-journal-voucher-dialog";
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import { cn } from '@/lib/utils';
import { 
  Settings, ChevronDown, BookCopy, ArrowRightLeft, Layers3, Repeat, Boxes, 
  FileUp, CreditCard, Ticket, FileCog, Network, Plane, GitBranch, Banknote, BookUser, ListChecks, FileText, 
  PlusCircle, Users2, ChevronsRightLeft, FileDown, Share2, AreaChart, Lightbulb, 
  Package, MessageSquare, History, FileImage, HelpCircle, FileBarChart, Menu, FileWarning, 
  ScanSearch, Paintbrush, Send, Trash2, DollarSign, DatabaseZap, Milestone, ShieldCheck, 
  Home, Activity, Wallet, Briefcase, BarChart3, Users, Brain, BarChart2, Settings2, HandCoins
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/auth-context';
import type { Permission } from '@/lib/types';

const NavLink = ({ href, children, active, className }: { href: string; children: React.ReactNode, active: boolean, className?: string }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all whitespace-nowrap font-bold justify-start",
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
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
      <DropdownMenuSubTrigger className="justify-between w-full"><span>إضافة عملية</span><PlusCircle className="h-4 w-4 ml-2" /></DropdownMenuSubTrigger>
      <DropdownMenuSubContent sideOffset={8} alignOffset={-5}>
        {hasPermission('bookings:create') && <DropdownMenuItem asChild><Link href="/bookings" className="justify-between w-full"><span>حجز طيران جديد</span><Ticket className="h-4 w-4 ml-2" /></Link></DropdownMenuItem>}
        {hasPermission('visas:create') && <DropdownMenuItem asChild><Link href="/visas" className="justify-between w-full"><span>حجز فيزا جديد</span><CreditCard className="h-4 w-4 ml-2" /></Link></DropdownMenuItem>}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

const CreateVoucherMenuItems = () => {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const onDataChanged = () => router.refresh();
  if (!hasPermission('vouchers:create')) return null;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="justify-between w-full"><span>إنشاء سند</span><PlusCircle className="h-4 w-4 ml-2" /></DropdownMenuSubTrigger>
      <DropdownMenuSubContent sideOffset={8} alignOffset={-5}>
        <Dialog modal={false}><NewStandardReceiptDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between w-full"><span>سند قبض عادي</span><FileDown className="h-4 w-4 ml-2" /></DropdownMenuItem></DialogTrigger></NewStandardReceiptDialog></Dialog>
        <Dialog modal={false}><NewDistributedReceiptDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between w-full"><span>سند قبض مخصص</span><GitBranch className="h-4 w-4 ml-2" /></DropdownMenuItem></DialogTrigger></NewDistributedReceiptDialog></Dialog>
        <Dialog modal={false}><NewPaymentVoucherDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between w-full"><span>سند دفع</span><FileUp className="h-4 w-4 ml-2" /></DropdownMenuItem></DialogTrigger></NewPaymentVoucherDialog></Dialog>
        <Dialog modal={false}><NewExpenseVoucherDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between w-full"><span>سند مصاريف</span><Banknote className="h-4 w-4 ml-2" /></DropdownMenuItem></DialogTrigger></NewExpenseVoucherDialog></Dialog>
        <Dialog modal={false}><NewJournalVoucherDialog onVoucherAdded={onDataChanged}><DialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between w-full"><span>سند قيد داخلي</span><BookUser className="h-4 w-4 ml-2" /></DropdownMenuItem></DialogTrigger></NewJournalVoucherDialog></Dialog>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

const NavMenu = ({ label, icon: Icon, children, activeRoutes, className }: { label: string; icon: React.ElementType; children: React.ReactNode; activeRoutes: string[]; className?: string; }) => {
  const pathname = usePathname();
  const isActive = activeRoutes.some(route => pathname.startsWith(route));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn(
          "group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors w-full justify-center whitespace-nowrap", 
          isActive && "bg-muted text-primary", 
          className
        )}>
          <Icon className="h-4 w-4" />
          {label}
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
};


export function MainNav({ isMobile = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission } = useAuth();

  const handleDataChange = () => router.refresh();
  
  const getVisibleItems = useCallback((items: any[]) => {
    return items.filter(item => {
        if (item.isSeparator || item.isLabel || item.component) return true;
        if (item.subItems) return getVisibleItems(item.subItems).length > 0;
        if (item.permission === undefined) return true; // Default to visible if no permission is set
        return hasPermission(item.permission as Permission);
    });
  }, [hasPermission]);

  const menuConfig = useMemo(() => {
    const allMenus = [
        {
            id: 'main',
            label: 'الرئيسية',
            icon: Home,
            href: "/dashboard",
            items: []
        },
        {
            id: 'operations',
            label: 'العمليات',
            icon: Activity,
            activeRoutes: ['/bookings', '/visas', '/accounts/remittances'],
            items: getVisibleItems([
              { component: <CreateNewOperationMenuItems />, permission: 'bookings:create' },
              { isSeparator: true, permission: 'bookings:create' },
              { href: "/bookings", label: "حجوزات الطيران", icon: Ticket, permission: 'bookings:read' },
              { href: "/visas", label: "حجوزات الفيزا", icon: CreditCard, permission: 'visas:read' },
              { href: "/accounts/remittances", label: "الحوالات", icon: ArrowRightLeft, permission: 'remittances:read' },
              { href: "/bookings/fly-changes", label: "تغييرات فلاي والوزن", icon: Package, permission: 'admin' },
            ])
        },
        {
            id: 'accounting',
            label: 'المحاسبة',
            icon: Wallet,
            activeRoutes: ['/accounts/vouchers', '/boxes', '/reconciliation', '/reports/debts', '/reports/profit-loss', '/reports/boxes', '/reports/cash-flow', '/reports/profitability-analysis', '/settings/accounting', '/settings/advanced-accounts-setup'],
            items: getVisibleItems([
              { component: <CreateVoucherMenuItems /> , permission: 'vouchers:create'},
              { isSeparator: true, permission: 'vouchers:read' },
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
            ])
        },
        {
            id: 'custom-business',
            label: 'الأعمال',
            icon: Briefcase,
            activeRoutes: ['/subscriptions', '/segments', '/exchanges', '/profit-sharing'],
            items: getVisibleItems([
                { isLabel: true, label: "الوحدات التجارية الأساسية", permission: 'public' },
                { href: "/subscriptions", label: "الاشتراكات", icon: Repeat, permission: 'subscriptions:read' },
                { href: "/segments", label: "السكمنت", icon: Layers3, permission: 'segments:read' },
                { href: "/exchanges", label: "إدارة البورصات", icon: ChevronsRightLeft, permission: 'admin' },
                { href: "/profit-sharing", label: "توزيع الحصص", icon: Share2, permission: 'admin' },
            ])
        },
        {
            id: 'reports',
            label: 'التقارير',
            icon: BarChart3,
            activeRoutes: ['/reports'],
            items: getVisibleItems([
              { href: "/reports/account-statement", label: "كشف الحساب المتقدم", icon: FileText, permission: 'reports:account_statement' },
              { href: "/reports/flight-analysis", label: "تحليل الرحلات", icon: Plane, permission: 'reports:flight_analysis' },
              { href: "/reports", label: "تقارير متقدمة", icon: Milestone, permission: 'reports:read:all' },
            ])
        },
        {
            id: 'relations',
            label: 'العلاقات',
            icon: Users,
            activeRoutes: ['/clients', '/suppliers', '/campaigns', '/chat'],
            items: getVisibleItems([
                { href: "/clients", label: "إدارة العلاقات", icon: Users2, permission: 'relations:read' },
                { component: <AddClientDialog onClientAdded={handleDataChange} onClientUpdated={handleDataChange}><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between w-full"><span>إضافة علاقة</span><PlusCircle className="h-4 w-4 ml-2" /></DropdownMenuItem></AddClientDialog>, permission: 'relations:create' },
                { isSeparator: true, permission: 'relations:read' },
                { href: "/campaigns", label: "الحملات", icon: Send, permission: 'campaigns:read' },
                { href: "/chat", label: "المحادثات", icon: MessageSquare, permission: 'chat:read' },
            ])
        },
        {
            id: 'settings',
            label: 'النظام',
            icon: Settings,
            activeRoutes: ['/settings', '/users', '/system', '/templates', '/finance-tools'],
            items: getVisibleItems([
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
              { isSeparator: true, permission: 'public' },
              { href: "/support", label: "الدعم والمساعدة", icon: HelpCircle, permission: 'public' },
              { href: "/coming-soon", label: "الميزات القادمة", icon: Lightbulb, permission: 'public' },
            ])
        },
    ];
    
    return allMenus.filter(menu => menu.items.length > 0 || menu.href);

  }, [getVisibleItems, handleDataChange]);

  const renderMenuItems = (items: any[]) => {
    return items.map((item, index) => {
        if (item.isLabel) return <DropdownMenuLabel key={`label-${index}`} className="text-right">{item.label}</DropdownMenuLabel>;
        if (item.isSeparator) return <DropdownMenuSeparator key={`sep-${index}`} />;
        if (item.component) return React.cloneElement(item.component, { key: `comp-${index}` });
        if (item.subItems) {
            const visibleSubItems = getVisibleItems(item.subItems);
            if (visibleSubItems.length === 0) return null;
            return (
                <DropdownMenuSub key={item.label}>
                    <DropdownMenuSubTrigger className="justify-between">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent sideOffset={8} alignOffset={-5}>
                        {renderMenuItems(visibleSubItems)}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            );
        }
        if (item.href) return <DropdownMenuItem asChild key={item.href}><Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4 ml-2" /></Link></DropdownMenuItem>;
        return null;
    });
  };

  if (isMobile) {
      return (
          <Accordion type="single" collapsible className="w-full">
              {menuConfig.map((menu) => (
                  <React.Fragment key={menu.id}>
                      {menu.href ? (
                          <NavLink href={menu.href} active={pathname === menu.href} className="w-full justify-start text-base py-3 px-2 font-bold">
                              <menu.icon className="h-5 w-5 ml-2" />
                              {menu.label}
                          </NavLink>
                      ) : (
                          <AccordionItem value={menu.id}>
                              <AccordionTrigger className="py-3 px-2 font-bold text-base hover:no-underline rounded-md data-[state=open]:text-primary justify-between">
                                  <div className="flex items-center gap-2"><menu.icon className="h-5 w-5" />{menu.label}</div>
                              </AccordionTrigger>
                              <AccordionContent className="pl-6 border-l-2 border-primary/50 ml-4">
                                  <div className="flex flex-col gap-1 mt-2">
                                      {menu.items.map(item => {
                                          if (!item.href || item.isSeparator || item.isLabel || item.component) return null;
                                          return (
                                            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-start">
                                              <item.icon className="h-4 w-4" /><span>{item.label}</span>
                                            </Link>
                                          )
                                      })}
                                  </div>
                              </AccordionContent>
                          </AccordionItem>
                      )}
                  </React.Fragment>
              ))}
          </Accordion>
      );
  }

  return (
    <nav className="flex items-center justify-center gap-2">
        {menuConfig.map(menu => (
          menu.href ? (
            <NavLink key={menu.id} href={menu.href} active={pathname === menu.href}><menu.icon className="h-4 w-4" />{menu.label}</NavLink>
          ) : (
            <NavMenu key={menu.id} label={menu.label} icon={menu.icon} activeRoutes={menu.activeRoutes}>
              {renderMenuItems(menu.items)}
            </NavMenu>
          )
        ))}
    </nav>
  );
}

