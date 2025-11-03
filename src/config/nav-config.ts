import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Plane,
  FileText,
  Settings,
  MessageSquare,
  CreditCard,
  Building,
  ArrowLeftRight,
  Layers3,
  PieChart,
  BookCopy,
  Wallet,
  Wand2,
  Waypoints,
  NotebookText,
  BarChart3,
  Users2,
  Network,
  Calculator,
  Repeat,
  Share2,
  AreaChart,
  Contact,
  FileBarChart,
  GitBranch,
  FileCog,
  FileTerminal,
  FileCheck2,
  FileX2,
  PenSquare,
  Landmark,
  Box,
  User,
  BellRing
} from "lucide-react";

export type NavLinkConfig = {
  id: string;
  titleKey: string;
  href: string;
  icon: LucideIcon;
};

export type NavMenuConfig = {
  id: string;
  titleKey: string;
  icon: LucideIcon;
  items: NavLinkConfig[];
};

export const navConfig: {
  mainNav: NavLinkConfig[];
  relations: NavMenuConfig;
  vouchers: NavMenuConfig;
  operations: NavMenuConfig;
  customBusiness: NavMenuConfig;
  reports: NavMenuConfig;
  additionalFeatures: NavMenuConfig;
  system: NavMenuConfig;
} = {
  mainNav: [
    {
      id: "dashboard",
      titleKey: "navigation.main.dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "accounts",
      titleKey: "navigation.main.accounts",
      href: "/accounts",
      icon: Wallet,
    },
  ],
  relations: {
    id: "relations",
    titleKey: "navigation.groups.relations.title",
    icon: Contact,
    items: [
      {
        id: "clients",
        titleKey: "navigation.groups.relations.items.clients",
        href: "/clients",
        icon: Users2,
      },
      {
        id: "campaigns",
        titleKey: "navigation.groups.relations.items.campaigns",
        href: "/campaigns",
        icon: MessageSquare,
      },
      {
        id: "chat",
        titleKey: "navigation.groups.relations.items.chat",
        href: "/chat",
        icon: MessageSquare,
      }
    ],
  },
  vouchers: {
    id: "vouchers",
    titleKey: "navigation.groups.vouchers.title",
    icon: FileText,
    items: [], // Populated dynamically in the navigation component
  },
  operations: {
    id: "operations",
    titleKey: "navigation.groups.operations.title",
    icon: Calculator,
    items: [
      {
        id: "bookings",
        titleKey: "navigation.groups.operations.items.bookings",
        href: "/bookings",
        icon: Plane,
      },
      {
        id: "visas",
        titleKey: "navigation.groups.operations.items.visas",
        href: "/visas",
        icon: CreditCard,
      },
      {
        id: "remittances",
        titleKey: "navigation.groups.operations.items.remittances",
        href: "/accounts/remittances",
        icon: ArrowLeftRight,
      },
    ],
  },
  customBusiness: {
    id: "customBusiness",
    titleKey: "navigation.groups.customBusiness.title",
    icon: Briefcase,
    items: [
      {
        id: "subscriptions",
        titleKey: "navigation.groups.customBusiness.items.subscriptions",
        href: "/subscriptions",
        icon: Repeat,
      },
      {
        id: "segments",
        titleKey: "navigation.groups.customBusiness.items.segments",
        href: "/segments",
        icon: Layers3,
      },
      {
        id: "exchanges",
        titleKey: "navigation.groups.customBusiness.items.exchanges",
        href: "/exchanges",
        icon: Waypoints,
      },
      {
        id: "profitSharing",
        titleKey: "navigation.groups.customBusiness.items.profitSharing",
        href: "/profit-sharing",
        icon: Share2,
      },
      {
        id: "flightAnalysis",
        titleKey: "navigation.groups.customBusiness.items.flightAnalysis",
        href: "/reports/flight-analysis",
        icon: Plane,
      }
    ]
  },
  reports: {
    id: "reports",
    titleKey: "navigation.groups.reports.title",
    icon: BarChart3,
    items: [
      {
        id: "debts",
        titleKey: "navigation.groups.reports.items.debts",
        href: "/reports/debts",
        icon: BookCopy,
      },
      {
        id: "accountStatement",
        titleKey: "navigation.groups.reports.items.accountStatement",
        href: "/reports/account-statement",
        icon: NotebookText,
      },
      {
        id: "profitLoss",
        titleKey: "navigation.groups.reports.items.profitLoss",
        href: "/reports/profit-loss",
        icon: FileBarChart,
      },
      {
        id: "profitability",
        titleKey: "navigation.groups.reports.items.profitability",
        href: "/reports/profitability-analysis",
        icon: PieChart,
      },
      {
        id: "cashFlow",
        titleKey: "navigation.groups.reports.items.cashFlow",
        href: "/reports/cash-flow",
        icon: Waypoints,
      },
      {
        id: "smartReconciliation",
        titleKey: "navigation.groups.reports.items.smartReconciliation",
        href: "/reconciliation",
        icon: Wand2,
      },
    ],
  },
  additionalFeatures: {
    id: "additionalFeatures",
    titleKey: "navigation.groups.additionalFeatures.title",
    icon: Briefcase,
    items: [
      {
        id: "boxes",
        titleKey: "navigation.groups.additionalFeatures.items.boxes",
        href: "/boxes",
        icon: Box,
      },
      {
        id: "suppliers",
        titleKey: "navigation.groups.additionalFeatures.items.suppliers",
        href: "/suppliers",
        icon: Building,
      },
      {
        id: "profile",
        titleKey: "navigation.groups.additionalFeatures.items.profile",
        href: "/profile",
        icon: User,
      },
      {
        id: "profits",
        titleKey: "navigation.groups.additionalFeatures.items.profits",
        href: "/profits",
        icon: AreaChart,
      },
      {
        id: "notifications",
        titleKey: "navigation.groups.additionalFeatures.items.notifications",
        href: "/notifications",
        icon: BellRing,
      },
      {
        id: "assets",
        titleKey: "navigation.groups.additionalFeatures.items.assets",
        href: "/settings/assets",
        icon: Wallet,
      }
    ],
  },
  system: {
    id: "system",
    titleKey: "navigation.groups.system.title",
    icon: Network,
    items: [
      {
        id: "generalSettings",
        titleKey: "navigation.groups.system.items.generalSettings",
        href: "/settings",
        icon: Settings,
      },
      {
        id: "accountingGuide",
        titleKey: "navigation.groups.system.items.accountingGuide",
        href: "/settings/accounting",
        icon: GitBranch,
      },
      {
        id: "users",
        titleKey: "navigation.groups.system.items.users",
        href: "/users",
        icon: Users,
      },
      {
        id: "financeTools",
        titleKey: "navigation.groups.system.items.financeTools",
        href: "/finance-tools",
        icon: Landmark,
      },
      {
        id: "templates",
        titleKey: "navigation.groups.system.items.templates",
        href: "/templates",
        icon: PenSquare,
      },
      {
        id: "activityLog",
        titleKey: "navigation.groups.system.items.activityLog",
        href: "/system/activity-log",
        icon: FileTerminal,
      },
      {
        id: "errorLog",
        titleKey: "navigation.groups.system.items.errorLog",
        href: "/system/error-log",
        icon: FileCog,
      },
      {
        id: "dataAudit",
        titleKey: "navigation.groups.system.items.dataAudit",
        href: "/system/data-audit",
        icon: FileCheck2,
      },
      {
        id: "deletedLog",
        titleKey: "navigation.groups.system.items.deletedLog",
        href: "/system/deleted-log",
        icon: FileX2,
      }
    ],
  },
};
