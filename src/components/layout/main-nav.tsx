"use client";

import React from 'react';
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
    Banknote,
    BookUser,
    ListChecks,
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
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/auth-context';
import { NAV_CONFIG } from '@/config/nav-config';
import { hasPermission } from '@/lib/permissions';

const NavMenu = ({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: React.ElementType;
  items: any[];
}) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = items.filter(
    (item) => !item.permission || hasPermission(user, item.permission)
  );

  if (visibleItems.length === 0) {
    return null;
  }

  const isActive = visibleItems.some((item) => pathname.startsWith(item.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className="gap-1.5 font-bold"
        >
          <Icon className="h-4 w-4" />
          {label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" dir="rtl">
        {visibleItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className="flex justify-between items-center w-full">
              <span>{item.label}</span>
              {item.icon && <item.icon className="h-4 w-4" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="hidden md:flex items-center gap-2">
      <Link href="/dashboard">
        <Button
          variant={pathname === "/dashboard" ? "secondary" : "ghost"}
          className="font-bold"
        >
          <LayoutDashboard className="h-4 w-4 me-2" />
          الرئيسية
        </Button>
      </Link>
      {NAV_CONFIG.map((section) => (
        <NavMenu
          key={section.id}
          label={section.label}
          icon={section.icon}
          items={section.items}
        />
      ))}
    </nav>
  );
}
