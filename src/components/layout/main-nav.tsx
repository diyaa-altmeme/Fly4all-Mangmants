
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navConfig } from '@/config/nav-config';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";
import NewStandardReceiptDialog from "@/app/accounts/vouchers/components/new-standard-receipt-dialog";
import NewDistributedReceiptDialog from "@/components/vouchers/components/new-distributed-receipt-dialog";
import NewPaymentVoucherDialog from "@/app/accounts/vouchers/components/new-payment-voucher-dialog";
import NewExpenseVoucherDialog from "@/app/accounts/vouchers/components/new-expense-voucher-dialog";
import NewJournalVoucherDialog from "@/components/vouchers/components/new-journal-voucher-dialog";
import AddClientDialog from "@/app/clients/components/add-client-dialog";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { ChevronDown, FileDown, GitBranch, FileUp, Banknote, BookUser, ListChecks, Settings } from "lucide-react";


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


const NavMenu = ({ menuConfig, activeRoutes }: {
  menuConfig: { title: string; icon: React.ElementType; items: any[] };
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
                {menuConfig.title}
                <menuConfig.icon className="h-4 w-4" />
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            {menuConfig.items.map((item: any, index: number) => (
                <DropdownMenuItem asChild key={index}>
                    <Link href={item.href} className="justify-between w-full">
                        <span>{item.title}</span>
                        {item.icon && <item.icon className="h-4 w-4" />}
                    </Link>
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
    </DropdownMenu>
  );
};


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
    
    const voucherDialogs = [
      { Dialog: NewStandardReceiptDialog, label: "سند قبض عادي", icon: FileDown, onSave: onDataChanged },
      { Dialog: NewDistributedReceiptDialog, label: "سند قبض مخصص", icon: GitBranch, onSave: onDataChanged },
      { Dialog: NewPaymentVoucherDialog, label: "سند دفع", icon: FileUp, onSave: onDataChanged },
      { Dialog: NewExpenseVoucherDialog, label: "سند مصاريف", icon: Banknote, onSave: onDataChanged },
      { Dialog: NewJournalVoucherDialog, label: "سند قيد داخلي", icon: BookUser, onSave: onDataChanged },
    ];

    if (isMobile) {
        return (
            <div className="flex flex-col gap-1">
                {voucherDialogs.map(({ Dialog, label, icon: Icon, onSave }) => {
                     const DialogComponent = Dialog as any;
                     return (
                        <DialogComponent key={label} onVoucherAdded={onSave}>
                            <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full">
                                <span>{label}</span><Icon className="h-4 w-4" />
                            </button>
                        </DialogComponent>
                     )
                })}
                <DropdownMenuSeparator />
                 {menuItems.map(item => <MobileSubItem key={item.href} href={item.href} icon={item.icon}>{item.label}</MobileSubItem>)}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 p-2">
             {voucherDialogs.map(({ Dialog, label, icon: Icon, onSave }) => {
                const DialogComponent = Dialog as any;
                return (
                    <DialogComponent key={label} onVoucherAdded={onSave}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                            <span>{label}</span>
                            <Icon className="h-4 w-4" />
                        </DropdownMenuItem>
                    </DialogComponent>
                )
             })}
            <DropdownMenuSeparator />
            {menuItems.map(item => (
                <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href} className="justify-between w-full"><span>{item.label}</span><item.icon className="h-4 w-4" /></Link>
                </DropdownMenuItem>
            ))}
        </div>
    )
}

const MainNavContent = () => {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { fetchData } = useVoucherNav();

  React.useEffect(() => {
      fetchData();
  }, [fetchData]);


  const renderMobileSubItems = (menu: typeof navConfig.mainNav[0] & { items?: any[] }) => {
      if (!menu.items) return null;

      if (menu.title === 'السندات') {
          return <CreateVoucherMenuItems isMobile={true} />;
      }
      
      return menu.items.map((item: any, itemIndex: number) => (
         <MobileSubItem key={itemIndex} href={item.href} icon={item.icon}>{item.title}</MobileSubItem>
      ));
  }

  if(isMobile) {
      return (
          <Accordion type="single" collapsible className="w-full">
              {navConfig.mainNav.map((item) => (
                 <NavLink key={item.href} href={item.href} active={pathname === item.href} className="w-full justify-end text-base">
                    {item.title}
                    <item.icon className="h-5 w-5" />
                  </NavLink>
              ))}
              {Object.values(navConfig).filter(v => Array.isArray((v as any).items)).map((menu: any, index: number) => (
                  <AccordionItem value={menu.title} key={index}>
                      <AccordionTrigger className="hover:no-underline text-base font-bold justify-end px-3 py-2 data-[state=open]:bg-muted">
                          <div className="flex items-center gap-2 justify-end">
                             {menu.title}
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
          </Accordion>
      )
  }

  return (
    <div className="w-full">
        <nav className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            {navConfig.mainNav.map((item) => (
                 <NavLink key={item.href} href={item.href} active={pathname === item.href} className="justify-end">
                    {item.title}
                    <item.icon className="h-4 w-4" />
                </NavLink>
            ))}
            {Object.values(navConfig).filter(v => Array.isArray((v as any).items)).map((menu: any, index: number) => {
                if (menu.title === 'السندات') {
                    return (
                        <DropdownMenu key={index}>
                            <DropdownMenuTrigger asChild>
                                <Button variant={pathname.startsWith('/accounts/vouchers') ? 'secondary' : 'ghost'} className={cn(
                                "group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors whitespace-nowrap w-full justify-end",
                                pathname.startsWith('/accounts/vouchers') && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                )}>
                                    {menu.title}
                                    <menu.icon className="h-4 w-4" />
                                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </Button>
                            </DropdownMenuTrigger>
                             <DropdownMenuContent>
                                <CreateVoucherMenuItems />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                }

                return (
                    <NavMenu 
                        key={index}
                        menuConfig={menu}
                        activeRoutes={menu.items.map((i: any) => i.href)}
                    />
                )
            })}
        </nav>
    </div>
  );
};


export function MainNav() {
    return <MainNavContent />;
}
