
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    Loader2,
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
} from 'lucide-react';
import { cn } from "@/lib/utils";
import NewStandardReceiptDialog from "@/app/accounts/vouchers/components/new-standard-receipt-dialog";
import NewDistributedReceiptDialog from "@/components/vouchers/components/new-distributed-receipt-dialog";
import NewPaymentVoucherDialog from "@/components/vouchers/components/new-payment-voucher-dialog";
import NewExpenseVoucherDialog from "@/components/vouchers/components/new-expense-voucher-dialog";
import NewJournalVoucherDialog from "@/components/vouchers/components/new-journal-voucher-dialog";
import AddClientDialog from "@/app/clients/components/add-client-dialog";
import { DropdownMenuSeparator, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";
import { DialogTrigger } from "@/components/ui/dialog";
import { useVoucherNav } from "@/context/voucher-nav-context";
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
    { href: "/subscriptions", label: "الاشتراكات", icon: Repeat, permission: 'subscriptions:read' },
    { href: "/accounts/remittances", label: "الحوالات", icon: ArrowRightLeft, permission: 'remittances:read' },
    { href: "/segments", label: "السكمنت", icon: Layers3, permission: 'segments:read' },
    { href: "/bookings/fly-changes", label: "تغييرات فلاي والوزن", icon: Package, permission: 'admin' },
    { href: "/exchanges", label: "إدارة البورصات", icon: ChevronsRightLeft, permission: 'admin' },
];

const reportsItems = [
    { href: "/reports/debts", label: "تقرير الأرصدة", icon: Wallet, permission: 'reports:debts' },
    { href: "/reports/account-statement", label: "كشف حساب", icon: FileText, permission: 'reports:account_statement' },
    { href: "/profits", label: "الأرباح الشهرية", icon: BarChart3, permission: 'reports:profits' },
    { href: "/reconciliation", label: "التدقيق الذكي", icon: Wand2, permission: 'admin' },
    { href: "/reports/advanced", label: "تقارير متقدمة", icon: AreaChart, permission: 'reports:read:all' },
    { href: "/reports/flight-analysis", label: "تحليل بيانات الطيران", icon: Plane, permission: 'reports:flight_analysis' },
];

const systemItems = [
    { href: "/settings", label: "الإعدادات العامة", icon: Settings, permission: 'settings:update' },
    { href: "/users", label: "الموظفين والصلاحيات", icon: Users, permission: 'users:read' },
    { href: "/boxes", label: "الصناديق", icon: Boxes, permission: 'admin' },
    { href: "/templates", label: "قوالب الرسائل", icon: FileImage, permission: 'admin' },
    { href: "/system/activity-log", label: "سجل النشاطات", icon: History, permission: 'system:audit_log:read' },
    { href: "/system/error-log", label: "سجل الأخطاء", icon: FileWarning, permission: 'system:error_log:read' },
    { href: "/system/data-audit", label: "فحص البيانات", icon: ScanSearch, permission: 'system:data_audit:run' },
    { href: "/support", label: "الدعم والمساعدة", icon: HelpCircle, permission: 'public' },
    { href: "/coming-soon", label: "الميزات القادمة", icon: Lightbulb, permission: 'public' },
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


const MainNavContent = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { fetchData } = useVoucherNav();
  const { hasPermission, user } = useAuth();

  React.useEffect(() => {
      fetchData();
  }, [fetchData]);


  const handleDataChange = () => {
    router.refresh();
  };
  
  const filterItems = (items: any[]) => {
      return items.filter(item => {
          if (item.permission === 'public') return true;
          if (item.permission === 'admin') return user && 'role' in user && user.role === 'admin';
          return hasPermission(item.permission as Permission);
      });
  }
  
  const menuConfig = [
       { 
           id: 'relations', 
           label: 'العلاقات', 
           icon: Contact, 
           activeRoutes: ['/clients', '/suppliers', '/relations'],
           permission: 'relations:read', 
           children: (
           <>
                {hasPermission('relations:read') && <DropdownMenuItem asChild>
                   <Link href="/clients" className="justify-between w-full flex items-center gap-2"><span>ادارة العلاقات</span><Users2 className="h-4 w-4" /></Link>
               </DropdownMenuItem>}
                {hasPermission('relations:create') && 
                <AddClientDialog onClientAdded={handleDataChange} onClientUpdated={handleDataChange}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between gap-2 w-full">
                        <span>إضافة علاقة</span>
                        <PlusCircle className="h-4 w-4" />
                    </DropdownMenuItem>
                </AddClientDialog>
                }
                <DropdownMenuSeparator />
                {hasPermission('settings:read') && <DropdownMenuItem asChild><Link href="/relations/settings" className="justify-between w-full flex items-center gap-2"><span>الإعدادات</span><Settings className="h-4 w-4" /></Link></DropdownMenuItem>}
           </>
      )},
      {
          id: 'operations', 
          label: 'العمليات المحاسبية', 
          icon: Calculator, 
          activeRoutes: ['/bookings', '/visas', '/subscriptions', '/accounts/remittances', '/segments', '/exchanges'], 
          children: (
           <>
             {filterItems(operationsItems).map(item => (
                 <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4" /></Link>
                </DropdownMenuItem>
            ))}
          </>
      )},
      {
          id: 'vouchers', 
          label: 'السندات', 
          icon: FileText, 
          activeRoutes: ['/accounts/vouchers'],
          permission: 'vouchers:read', 
          children: <CreateVoucherMenuItems /> 
      },
      {
          id: 'reports', 
          label: 'التقارير والأدوات', 
          icon: BarChart3, 
          activeRoutes: ['/reports', '/profits', '/profit-sharing', '/reconciliation'], 
          children: (
           <>
             {filterItems(reportsItems).map(item => (
                 <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4" /></Link>
                </DropdownMenuItem>
            ))}
          </>
      )},
      {
          id: 'system', 
          label: 'النظام', 
          icon: Network, 
          activeRoutes: ['/settings', '/users', '/boxes', '/coming-soon', '/hr', '/system', '/templates', '/support'], 
          children: (
           <>
             {filterItems(systemItems).map(item => (
                 <DropdownMenuItem asChild key={item.label}>
                    <Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4" /></Link>
                </DropdownMenuItem>
            ))}
          </>
      )},
  ].filter(menu => {
      if (!menu.children) return false;
      if (menu.id === 'relations') return hasPermission('relations:read') || hasPermission('relations:create');
      if (menu.id === 'vouchers') return hasPermission('vouchers:read') || hasPermission('vouchers:create');

      const childItems = menu.id === 'operations' ? operationsItems : menu.id === 'reports' ? reportsItems : menu.id === 'system' ? systemItems : [];
      return filterItems(childItems).length > 0;
  });
  
  const renderMobileSubItems = (menu: any) => {
      // ... (code for mobile rendering with permissions)
      if (menu.id === 'vouchers') {
          return <CreateVoucherMenuItems isMobile={true} />;
      }

      if (menu.id === 'relations') {
           return (
            <div className="flex flex-col gap-1">
                {hasPermission('relations:read') && <MobileSubItem href="/clients" icon={Users2}>ادارة العلاقات</MobileSubItem>}
                {hasPermission('relations:create') && <AddClientDialog onClientAdded={handleDataChange} onClientUpdated={handleDataChange}>
                    <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full">
                       <span>إضافة علاقة</span>
                       <PlusCircle className="h-4 w-4" />
                    </button>
                </AddClientDialog>}
                {hasPermission('settings:read') && <MobileSubItem href="/relations/settings" icon={Settings}>الإعدادات</MobileSubItem>}
            </div>
        )
      }
      
      if (menu.id === 'system') {
           return (
             <div className="flex flex-col gap-1">
                {filterItems(systemItems).map(item => <MobileSubItem key={item.href} href={item.href} icon={item.icon}>{item.label}</MobileSubItem>)}
            </div>
           )
      }

      const itemsToRender = menu.id === 'operations' ? operationsItems : menu.id === 'reports' ? reportsItems : [];

      if (itemsToRender.length > 0) {
           return (
             <div className="flex flex-col gap-1">
                {filterItems(itemsToRender).map(item => <MobileSubItem key={item.href} href={item.href} icon={item.icon}>{item.label}</MobileSubItem>)}
            </div>
           )
      }

      return menu.children;
  }

  if(isMobile) {
      return (
          <Accordion type="single" collapsible className="w-full">
              {hasPermission('dashboard:read') && <NavLink href="/dashboard" active={pathname === '/dashboard'} className="w-full justify-end text-base">
                الرئيسية
                <LayoutDashboard className="h-5 w-5" />
              </NavLink>}
               {menuConfig.map((menu, index) => (
                  <AccordionItem value={menu.id} key={menu.id}>
                      <AccordionTrigger className="hover:no-underline text-base font-bold justify-end px-3 py-2 data-[state=open]:bg-muted">
                          <div className="flex items-center gap-2 justify-end">
                             {menu.label}
                             <menu.icon className="h-5 w-5" />
                          </div>
                      </AccordionTrigger>
                       <AccordionContent>
                           <div className="flex flex-col gap-1 pr-6">
                               {renderMobileSubItems(menu)}
                           </div>
                       </AccordionContent>
                  </AccordionItem>
              ))}
               {/* Campaigns is public for now */}
               <NavLink href="/campaigns" active={pathname === '/campaigns'} className="w-full justify-end text-base">
                الحملات
                <MessageSquare className="h-5 w-5" />
              </NavLink>
          </Accordion>
      )
  }

  return (
    <div className="w-full">
        <nav className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
             {hasPermission('dashboard:read') && <NavLink href="/dashboard" active={pathname === '/dashboard'} className="justify-end">
                الرئيسية
                <LayoutDashboard className="h-4 w-4" />
            </NavLink>}
            
            {menuConfig.map(menu => (
                <NavMenu 
                    key={menu.id}
                    label={menu.label}
                    icon={menu.icon}
                    activeRoutes={menu.activeRoutes}
                >
                   {menu.children}
                </NavMenu>
            ))}
            
            {/* Campaigns is public for now */}
            <NavLink href="/campaigns" active={pathname === '/campaigns'} className="justify-end">
                الحملات
                <MessageSquare className="h-4 w-4" />
            </NavLink>
        </nav>
    </div>
  );
};


export function MainNav() {
    return <MainNavContent />;
}
