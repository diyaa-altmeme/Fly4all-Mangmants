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
import { DropdownMenuSeparator, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";
import { DialogTrigger } from "../ui/dialog";
import { useVoucherNav } from "@/context/voucher-nav-context";

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
    { href: "/bookings", label: "حجوزات الطيران", icon: Ticket },
    { href: "/visas", label: "حجوزات الفيزا", icon: CreditCard },
    { href: "/subscriptions", label: "الاشتراكات", icon: Repeat },
    { href: "/accounts/remittances", label: "الحوالات", icon: ArrowRightLeft },
    { href: "/segments", label: "السكمنت", icon: Layers3 },
    { href: "/bookings/fly-changes", label: "تغييرات فلاي والوزن", icon: Package },
    { href: "/exchanges", label: "إدارة البورصات", icon: ChevronsRightLeft },
];

const reportsItems = [
    { href: "/reports/debts", label: "تقرير الأرصدة", icon: Wallet },
    { href: "/reports/account-statement", label: "كشف حساب", icon: FileText },
    { href: "/reports/boxes", label: "تقرير الصناديق", icon: Boxes },
    { href: "/profits", label: "الأرباح الشهرية", icon: BarChart3 },
    { href: "/profit-sharing", label: "توزيع الحصص", icon: Share2 },
    { href: "/reconciliation", label: "التدقيق الذكي", icon: Wand2 },
    { href: "/reports/advanced", label: "تقارير متقدمة", icon: AreaChart },
    { href: "/reports/flight-analysis", label: "تحليل بيانات الطيران", icon: Plane },
];

const systemItems = [
    { href: "/settings", label: "الإعدادات العامة", icon: Settings },
    { href: "/templates", label: "قوالب الرسائل", icon: FileImage },
    { href: "/system/activity-log", label: "سجل النشاطات", icon: History },
    { href: "/system/error-log", label: "سجل الأخطاء", icon: FileWarning },
    { href: "/system/data-audit", label: "فحص البيانات", icon: ScanSearch },
    { href: "/support", label: "الدعم والمساعدة", icon: HelpCircle },
    { href: "/coming-soon", label: "الميزات القادمة", icon: Lightbulb },
];

const MobileSubItem = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) => (
    <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end">
        <span>{children}</span>
        <Icon className="h-4 w-4" />
    </Link>
);


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
                <NewStandardReceiptDialog onVoucherAdded={onDataChanged}>
                    <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند قبض عادي</span><FileDown className="h-4 w-4" /></button>
                </NewStandardReceiptDialog>
                <NewDistributedReceiptDialog onVoucherAdded={onDataChanged}>
                    <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند قبض مخصص</span><GitBranch className="h-4 w-4" /></button>
                </NewDistributedReceiptDialog>
                <NewPaymentVoucherDialog onVoucherAdded={onDataChanged}>
                     <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند دفع</span><FileUp className="h-4 w-4" /></button>
                </NewPaymentVoucherDialog>
                <NewExpenseVoucherDialog onVoucherAdded={onDataChanged}>
                     <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند مصاريف</span><Banknote className="h-4 w-4" /></button>
                </NewExpenseVoucherDialog>
                <NewJournalVoucherDialog onVoucherAdded={onDataChanged}>
                     <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full"><span>سند قيد داخلي</span><BookUser className="h-4 w-4" /></button>
                </NewJournalVoucherDialog>
                <DropdownMenuSeparator />
                 {menuItems.map(item => <MobileSubItem key={item.href} href={item.href} icon={item.icon}>{item.label}</MobileSubItem>)}
            </div>
        );
    }
    

    return (
        <div className="flex flex-col gap-1 p-2">
             <NewStandardReceiptDialog onVoucherAdded={onDataChanged}>
                 <Button variant="ghost" className="justify-between gap-2 w-full">
                    <span>سند قبض عادي</span>
                    <FileDown className="h-4 w-4" />
                </Button>
            </NewStandardReceiptDialog>
            <NewDistributedReceiptDialog onVoucherAdded={onDataChanged}>
                 <Button variant="ghost" className="justify-between gap-2 w-full">
                    <span>سند قبض مخصص</span>
                    <GitBranch className="h-4 w-4" />
                </Button>
            </NewDistributedReceiptDialog>
            <NewPaymentVoucherDialog onVoucherAdded={onDataChanged}>
                 <Button variant="ghost" className="justify-between gap-2 w-full">
                    <span>سند دفع</span>
                    <FileUp className="h-4 w-4" />
                </Button>
            </NewPaymentVoucherDialog>
            <NewExpenseVoucherDialog onVoucherAdded={onDataChanged}>
                <Button variant="ghost" className="justify-between gap-2 w-full">
                    <span>سند مصاريف</span>
                    <Banknote className="h-4 w-4" />
                </Button>
            </NewExpenseVoucherDialog>
            <NewJournalVoucherDialog onVoucherAdded={onDataChanged}>
                 <Button variant="ghost" className="justify-between gap-2 w-full">
                    <span>سند قيد داخلي</span>
                    <BookUser className="h-4 w-4" />
                </Button>
            </NewJournalVoucherDialog>
            <DropdownMenuSeparator />
            {menuItems.map(item => (
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

  React.useEffect(() => {
      fetchData();
  }, [fetchData]);


  const handleDataChange = () => {
    router.refresh();
  };
  
  const menuConfig = [
       { id: 'relations', label: 'العلاقات', icon: Contact, activeRoutes: ['/clients', '/suppliers', '/relations'], children: (
           <>
                <DropdownMenuItem asChild>
                   <Link href="/clients" className="justify-between w-full flex items-center gap-2"><span>ادارة العلاقات</span><Users2 className="h-4 w-4" /></Link>
               </DropdownMenuItem>
                <AddClientDialog onClientAdded={handleDataChange} onClientUpdated={handleDataChange}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between gap-2 w-full">
                        <span>إضافة علاقة</span>
                        <PlusCircle className="h-4 w-4" />
                    </DropdownMenuItem>
                </AddClientDialog>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/settings" className="justify-between w-full flex items-center gap-2"><span>الإعدادات</span><Settings className="h-4 w-4" /></Link></DropdownMenuItem>
           </>
      )},
      { id: 'operations', label: 'العمليات المحاسبية', icon: Calculator, activeRoutes: ['/bookings', '/visas', '/subscriptions', '/accounts/remittances', '/segments', '/exchanges'], children: (
           <>
             {operationsItems.map(item => (
                 <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4" /></Link>
                </DropdownMenuItem>
            ))}
          </>
      )},
      { id: 'vouchers', label: 'السندات', icon: FileText, activeRoutes: ['/accounts/vouchers'], children: <CreateVoucherMenuItems /> },
      { id: 'reports', label: 'التقارير والأدوات', icon: BarChart3, activeRoutes: ['/reports', '/profits', '/profit-sharing', '/reconciliation'], children: (
           <>
             {reportsItems.map(item => (
                 <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4" /></Link>
                </DropdownMenuItem>
            ))}
          </>
      )},
      { id: 'system', label: 'النظام', icon: Network, activeRoutes: ['/settings', '/users', '/boxes', '/coming-soon', '/hr', '/system', '/templates', '/support'], children: (
           <>
                <DropdownMenuItem asChild>
                    <Link href="/users" className="justify-between w-full"><span>الموظفين والصلاحيات</span><Briefcase className="h-4 w-4"/></Link>
                </DropdownMenuItem>
             {systemItems.map(item => (
                 <DropdownMenuItem asChild key={item.label}>
                    <Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4" /></Link>
                </DropdownMenuItem>
            ))}
          </>
      )},
  ];
  
  const renderMobileSubItems = (menu: typeof menuConfig[0]) => {
      if (menu.id === 'vouchers') {
          return <CreateVoucherMenuItems isMobile={true} />;
      }

      if (menu.id === 'relations') {
           return (
            <div className="flex flex-col gap-1">
                <MobileSubItem href="/clients" icon={Users2}>ادارة العلاقات</MobileSubItem>
                 <AddClientDialog onClientAdded={handleDataChange} onClientUpdated={handleDataChange}>
                    <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full">
                       <span>إضافة علاقة</span>
                       <PlusCircle className="h-4 w-4" />
                    </button>
                </AddClientDialog>
                <MobileSubItem href="/settings" icon={Settings}>الإعدادات</MobileSubItem>
            </div>
        )
      }
      
      if (menu.id === 'system') {
           return (
             <div className="flex flex-col gap-1">
                <MobileSubItem href="/users" icon={Briefcase}>الموظفين والصلاحيات</MobileSubItem>
                {systemItems.map(item => <MobileSubItem key={item.href} href={item.href} icon={item.icon}>{item.label}</MobileSubItem>)}
            </div>
           )
      }

      if (React.isValidElement(menu.children) && menu.children.type === React.Fragment) {
          return React.Children.map(menu.children.props.children, (child) => {
              if (!React.isValidElement(child)) return null;

              if (child.type === DropdownMenuItem && child.props.asChild) {
                  const link = child.props.children;
                  if (React.isValidElement(link) && link.type === Link) {
                      const text = link.props.children[0];
                      const icon = link.props.children[1];
                      return <MobileSubItem href={link.props.href} icon={icon.type}>{text}</MobileSubItem>;
                  }
              }
              return null;
          });
      }
      return menu.children;
  }

  if(isMobile) {
      return (
          <Accordion type="single" collapsible className="w-full">
              <NavLink href="/dashboard" active={pathname === '/dashboard'} className="w-full justify-end text-base">
                الرئيسية
                <LayoutDashboard className="h-5 w-5" />
              </NavLink>
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
             <NavLink href="/dashboard" active={pathname === '/dashboard'} className="justify-end">
                الرئيسية
                <LayoutDashboard className="h-4 w-4" />
            </NavLink>
            
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
