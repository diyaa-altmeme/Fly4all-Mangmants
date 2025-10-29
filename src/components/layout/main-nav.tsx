
"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { navConfig } from '@/config/nav-config';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';

type NavItemConfig = {
  title: string;
  href: string;
  icon?: React.ElementType;
  permission?: any;
  subItems?: NavItemConfig[];
};

type NavSectionConfig = {
  title: string;
  icon?: React.ElementType;
  items: NavItemConfig[];
};

const renderNavItem = (item: NavItemConfig, isSubItem = false) => {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const Icon = item.icon;
  const { user } = useAuth();

  if (item.permission && !hasPermission(user as User, item.permission)) {
    return null;
  }

  if (item.subItems) {
    const visibleSubItems = item.subItems.filter(sub => !sub.permission || hasPermission(user as User, sub.permission));
    if (visibleSubItems.length === 0) return null;
    
    return (
      <DropdownMenuSub key={item.title}>
        <DropdownMenuSubTrigger className={cn(
          "flex cursor-pointer items-center justify-between w-full",
          { "font-bold": isActive }
        )}>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            <span>{item.title}</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            {visibleSubItems.map((subItem) => renderNavItem(subItem, true))}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenuItem key={item.href} asChild>
      <Link href={item.href} className={cn(
        "flex items-center justify-between w-full",
        { "font-bold": isActive }
      )}>
        <span>{item.title}</span>
        {Icon && !isSubItem && <Icon className="h-4 w-4" />}
      </Link>
    </DropdownMenuItem>
  );
};

const NavMenu = ({ title, icon: SectionIcon, items }: { title: string, icon?: React.ElementType, items: NavItemConfig[]}) => {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const visibleItems = items.filter(item => !item.permission || hasPermission(user as User, item.permission));
  if (visibleItems.length === 0) return null;

  const isActive = items.some(item => item.href && pathname.startsWith(item.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className="gap-1.5 font-bold"
        >
          {SectionIcon && <SectionIcon className="h-4 w-4" />}
          {title}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" dir="rtl" className="w-64">
        {visibleItems.map((item) => renderNavItem(item))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="hidden md:flex items-center gap-2">
      {navConfig.mainNav.map((item) => {
        if (item.permission && !hasPermission(user as User, item.permission)) return null;
         const Icon = item.icon;
        return(
        <Link key={item.href} href={item.href}>
          <Button
            variant={pathname === item.href ? "secondary" : "ghost"}
            className="font-bold"
          >
            {Icon && <Icon className="h-4 w-4 me-2" />}
            {item.title}
          </Button>
        </Link>
      )})}
      
      {Object.values(navConfig).filter(section => typeof section === 'object' && 'title' in section && Array.isArray((section as any).items)).map((section) => (
        <NavMenu
          key={(section as NavSectionConfig).title}
          title={(section as NavSectionConfig).title}
          icon={(section as NavSectionConfig).icon}
          items={(section as NavSectionConfig).items}
        />
      ))}
    </nav>
  );
}

    