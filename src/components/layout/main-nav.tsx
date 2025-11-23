
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navConfig, type NavLinkConfig, type NavMenuConfig } from '@/config/nav-config';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";
import NewStandardReceiptDialog from "@/app/accounts/vouchers/components/new-standard-receipt-dialog";
import NewDistributedReceiptDialog from "@/components/vouchers/components/new-distributed-receipt-dialog";
import NewPaymentVoucherDialog from "@/app/accounts/vouchers/components/new-payment-voucher-dialog";
import NewExpenseVoucherDialog from "@/components/vouchers/components/new-expense-voucher-dialog";
import NewJournalVoucherDialog from "@/components/vouchers/components/new-journal-voucher-dialog";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { ChevronDown, FileDown, GitBranch, FileUp, Banknote, BookUser } from "lucide-react";
import { useTranslation } from "@/i18n";

const NavLink = ({ href, children, active, className }: { href: string; children: React.ReactNode; active: boolean; className?: string }) => (
  <Link
    href={href}
    className={cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all whitespace-nowrap font-bold justify-end rtl:flex-row-reverse ltr:justify-start",
      active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
      className
    )}
  >
    {children}
  </Link>
);

const NavMenu = ({ menuConfig, activeRoutes }: { menuConfig: NavMenuConfig; activeRoutes: string[] }) => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isActive = activeRoutes.some(route => pathname.startsWith(route));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className={cn(
            "group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors whitespace-nowrap w-full justify-end rtl:flex-row-reverse ltr:justify-start",
            isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          )}
        >
          {t(menuConfig.titleKey)}
          <menuConfig.icon className="h-4 w-4" />
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {menuConfig.items.map(item => (
          <DropdownMenuItem asChild key={item.id}>
            <Link href={item.href} className="flex w-full items-center justify-between">
              <span>{t(item.titleKey)}</span>
              {item.icon && <item.icon className="h-4 w-4" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MobileSubItem = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) => (
  <Link
    href={href}
    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end rtl:flex-row-reverse ltr:justify-start"
  >
    <span>{children}</span>
    <Icon className="h-4 w-4" />
  </Link>
);

const CreateVoucherMenuItems = ({ isMobile = false }: { isMobile?: boolean }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const onDataChanged = () => router.refresh();

  const menuItems = navConfig.vouchers.items;

  const voucherDialogs = [
    { Dialog: NewStandardReceiptDialog, labelKey: "navigation.groups.vouchers.items.standardReceipt", icon: FileDown, onSave: onDataChanged },
    { Dialog: NewDistributedReceiptDialog, labelKey: "navigation.groups.vouchers.items.distributedReceipt", icon: GitBranch, onSave: onDataChanged },
    { Dialog: NewPaymentVoucherDialog, labelKey: "navigation.groups.vouchers.items.paymentVoucher", icon: FileUp, onSave: onDataChanged },
    { Dialog: NewExpenseVoucherDialog, labelKey: "navigation.groups.vouchers.items.expenseVoucher", icon: Banknote, onSave: onDataChanged },
    { Dialog: NewJournalVoucherDialog, labelKey: "navigation.groups.vouchers.items.journalVoucher", icon: BookUser, onSave: onDataChanged },
  ];

  if (isMobile) {
    return (
      <div className="flex flex-col gap-1">
        {voucherDialogs.map(({ Dialog, labelKey, icon: Icon, onSave }) => {
          const DialogComponent = Dialog as any;
          return (
            <DialogComponent key={labelKey} onVoucherAdded={onSave}>
              <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted justify-end w-full rtl:flex-row-reverse ltr:justify-start">
                <span>{t(labelKey)}</span>
                <Icon className="h-4 w-4" />
              </button>
            </DialogComponent>
          );
        })}
        <DropdownMenuSeparator />
        {menuItems.map(item => (
          <MobileSubItem key={item.id} href={item.href} icon={item.icon}>
            {t(item.titleKey)}
          </MobileSubItem>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {voucherDialogs.map(({ Dialog, labelKey, icon: Icon, onSave }) => {
        const DialogComponent = Dialog as any;
        return (
          <DialogComponent key={labelKey} onVoucherAdded={onSave}>
            <DropdownMenuItem onSelect={event => event.preventDefault()} className="justify-between">
              <span>{t(labelKey)}</span>
              <Icon className="h-4 w-4" />
            </DropdownMenuItem>
          </DialogComponent>
        );
      })}
      <DropdownMenuSeparator />
      {menuItems.map(item => (
        <DropdownMenuItem asChild key={item.id}>
          <Link href={item.href} className="flex w-full items-center justify-between">
            <span>{t(item.titleKey)}</span>
            <item.icon className="h-4 w-4" />
          </Link>
        </DropdownMenuItem>
      ))}
    </div>
  );
};

const MainNavContent = () => {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { fetchData } = useVoucherNav();
  const { t } = useTranslation();

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const menuGroups: NavMenuConfig[] = [
    navConfig.relations,
    navConfig.vouchers,
    navConfig.operations,
    navConfig.customBusiness,
    navConfig.reports,
    navConfig.additionalFeatures,
    navConfig.system,
  ];

  const renderMobileSubItems = (menu: NavMenuConfig) => {
    if (menu.id === "vouchers") {
      return <CreateVoucherMenuItems isMobile />;
    }

    return menu.items.map(item => (
      <MobileSubItem key={item.id} href={item.href} icon={item.icon}>
        {t(item.titleKey)}
      </MobileSubItem>
    ));
  };

  if (isMobile) {
    return (
      <Accordion type="single" collapsible className="w-full">
        {navConfig.mainNav.map(item => (
          <NavLink key={item.id} href={item.href} active={pathname === item.href} className="w-full justify-end text-base">
            {t(item.titleKey)}
            <item.icon className="h-5 w-5" />
          </NavLink>
        ))}
        {menuGroups.map(menu => (
          <AccordionItem value={menu.id} key={menu.id}>
            <AccordionTrigger className="hover:no-underline text-base font-bold justify-end px-3 py-2 data-[state=open]:bg-muted rtl:flex-row-reverse ltr:justify-start">
              <div className="flex items-center gap-2 justify-end">
                {t(menu.titleKey)}
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
    );
  }

  return (
    <div className="w-full">
      <nav className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
        {navConfig.mainNav.map(item => (
          <NavLink key={item.id} href={item.href} active={pathname === item.href} className="justify-end">
            {t(item.titleKey)}
            <item.icon className="h-4 w-4" />
          </NavLink>
        ))}
        {menuGroups.map(menu => {
          if (menu.id === "vouchers") {
            return (
              <DropdownMenu key={menu.id}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={pathname.startsWith("/accounts/vouchers") ? "secondary" : "ghost"}
                    className={cn(
                      "group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors whitespace-nowrap w-full justify-end rtl:flex-row-reverse ltr:justify-start",
                      pathname.startsWith("/accounts/vouchers") &&
                        "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    )}
                  >
                    {t(menu.titleKey)}
                    <menu.icon className="h-4 w-4" />
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <CreateVoucherMenuItems />
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <NavMenu
              key={menu.id}
              menuConfig={menu}
              activeRoutes={menu.items.map((item: NavLinkConfig) => item.href)}
            />
          );
        })}
      </nav>
    </div>
  );
};

export function MainNav() {
  return <MainNavContent />;
}
