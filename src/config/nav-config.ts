
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  CreditCard,
  Repeat,
  ArrowRightLeft,
  Layers3,
  Package,
  FileText,
  Wallet,
  Boxes,
  BarChart3,
  Share2,
  Wand2,
  AreaChart,
  Users,
  Briefcase,
  MessageSquare,
  Settings,
  ListChecks,
  Plane,
  GitBranch,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  BookUser,
  FileCog,
  Network,
  Calculator,
  Users2,
  Contact,
  FileBarChart,
  FileTerminal,
  FileCheck2,
  FileX2,
  PenSquare,
  Landmark,
  Box,
  User,
  BellRing,
  FileDown,
  RefreshCcw,
  Trash2,
  LifeBuoy,
  Palette,
  NotebookText,
  Waypoints,
  PieChart,
  BookCopy,
  Building,
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
      },
      {
        id: "relationsSettings",
        titleKey: "navigation.groups.relations.items.settings",
        href: "/relations/settings",
        icon: Settings,
      },
      {
        id: "relationsImport",
        titleKey: "navigation.groups.relations.items.import",
        href: "/relations/settings/import",
        icon: FileDown,
      },
    ],
  },
  vouchers: {
    id: "vouchers",
    titleKey: "navigation.groups.vouchers.title",
    icon: FileText,
    items: [
      {
        id: "log",
        titleKey: "navigation.groups.vouchers.items.log",
        href: "/accounts/vouchers/log",
        icon: FileBarChart,
      },
      {
        id: "settings",
        titleKey: "navigation.groups.vouchers.items.settings",
        href: "/settings",
        icon: Settings,
      },
    ],
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
        id: "bookingsDeleted",
        titleKey: "navigation.groups.operations.items.bookingsDeleted",
        href: "/bookings/deleted-bookings",
        icon: Trash2,
      },
      {
        id: "bookingsFlyChanges",
        titleKey: "navigation.groups.operations.items.bookingsFlyChanges",
        href: "/bookings/fly-changes",
        icon: RefreshCcw,
      },
      {
        id: "visas",
        titleKey: "navigation.groups.operations.items.visas",
        href: "/visas",
        icon: CreditCard,
      },
      {
        id: "visasDeleted",
        titleKey: "navigation.groups.operations.items.visasDeleted",
        href: "/visas/deleted-visas",
        icon: Trash2,
      },
      {
        id: "remittances",
        titleKey: "navigation.groups.operations.items.remittances",
        href: "/accounts/remittances",
        icon: ArrowRightLeft,
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
        id: "subscriptionsDeleted",
        titleKey: "navigation.groups.customBusiness.items.subscriptionsDeleted",
        href: "/subscriptions/deleted-subscriptions",
        icon: Trash2,
      },
      {
        id: "segments",
        titleKey: "navigation.groups.customBusiness.items.segments",
        href: "/segments",
        icon: Layers3,
      },
      {
        id: "segmentsDeleted",
        titleKey: "navigation.groups.customBusiness.items.segmentsDeleted",
        href: "/segments/deleted-segments",
        icon: Trash2,
      },
      {
        id: "exchanges",
        titleKey: "navigation.groups.customBusiness.items.exchanges",
        href: "/exchanges",
        icon: Waypoints,
      },
      {
        id: "exchangesReport",
        titleKey: "navigation.groups.customBusiness.items.exchangesReport",
        href: "/exchanges/report",
        icon: FileBarChart,
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
        id: "overview",
        titleKey: "navigation.groups.reports.items.overview",
        href: "/reports",
        icon: BarChart3,
      },
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
        id: "accountStatementDashboard",
        titleKey: "navigation.groups.reports.items.accountStatementDashboard",
        href: "/reports/account-statement/dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "boxes",
        titleKey: "navigation.groups.reports.items.boxes",
        href: "/reports/boxes",
        icon: Box,
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
        id: "financeOverview",
        titleKey: "navigation.groups.reports.items.financeOverview",
        href: "/finance/overview",
        icon: AreaChart,
      },
      {
        id: "financeDashboard",
        titleKey: "navigation.groups.reports.items.financeDashboard",
        href: "/dashboard/finance",
        icon: AreaChart,
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
        id: "profitsManual",
        titleKey: "navigation.groups.additionalFeatures.items.profitsManual",
        href: "/profits/manual",
        icon: NotebookText,
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
      },
      {
        id: "support",
        titleKey: "navigation.groups.additionalFeatures.items.support",
        href: "/support",
        icon: LifeBuoy,
      },
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
        id: "chartOfAccounts",
        titleKey: "navigation.groups.system.items.chartOfAccounts",
        href: "/settings/accounting/chart-of-accounts",
        icon: GitBranch,
      },
      {
        id: "settingsFinance",
        titleKey: "navigation.groups.system.items.settingsFinance",
        href: "/settings/finance",
        icon: Calculator,
      },
      {
        id: "settingsFinanceTools",
        titleKey: "navigation.groups.system.items.settingsFinanceTools",
        href: "/settings/finance-tools",
        icon: FileCog,
      },
      {
        id: "clientPermissions",
        titleKey: "navigation.groups.system.items.clientPermissions",
        href: "/settings/client-permissions",
        icon: Users,
      },
      {
        id: "appearance",
        titleKey: "navigation.groups.system.items.appearance",
        href: "/settings/appearance",
        icon: Palette,
      },
      {
        id: "themes",
        titleKey: "navigation.groups.system.items.themes",
        href: "/settings/themes",
        icon: Layers3,
      },
      {
        id: "invoiceSequences",
        titleKey: "navigation.groups.system.items.invoiceSequences",
        href: "/settings/invoice-sequences",
        icon: NotebookText,
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
        id: "financeToolsAudit",
        titleKey: "navigation.groups.system.items.financeToolsAudit",
        href: "/finance-tools/ai-audit",
        icon: Wand2,
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
      },
      {
        id: "setupAdmin",
        titleKey: "navigation.groups.system.items.setupAdmin",
        href: "/setup-admin",
        icon: User,
      },
    ],
  },
};
