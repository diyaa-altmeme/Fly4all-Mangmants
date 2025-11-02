
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Plane,
  FileText,
  Settings,
  ShieldCheck,
  MessageSquare,
  CreditCard,
  Building,
  ArrowLeftRight,
  Ticket,
  Layers3,
  PieChart,
  BookCopy,
  Wallet,
  ReceiptText,
  Container,
  Wand2,
  Activity,
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
  Bell,
  Box,
  User,
  BellRing
} from "lucide-react";

export const navConfig = {
  mainNav: [
    {
      title: "الرئيسية",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "مركز الحسابات",
      href: "/accounts",
      icon: Wallet,
    },
  ],
  relations: {
    title: "العلاقات",
    icon: Contact,
    items: [
      {
        title: "ادارة العلاقات",
        href: "/clients",
        icon: Users2,
      },
      {
        title: "الحملات",
        href: "/campaigns",
        icon: MessageSquare,
      },
      {
        title: "المحادثات",
        href: "/chat",
        icon: MessageSquare,
      }
    ],
  },
  vouchers: {
    title: "السندات",
    icon: FileText,
    items: [
       // This will be populated dynamically by the CreateVoucherMenuItems component
    ],
  },
  operations: {
    title: "العمليات المحاسبية",
    icon: Calculator,
    items: [
      {
        title: "حجوزات الطيران",
        href: "/bookings",
        icon: Plane,
      },
      {
        title: "طلبات الفيزا",
        href: "/visas",
        icon: CreditCard,
      },
       {
        title: "الحوالات",
        href: "/accounts/remittances",
        icon: ArrowLeftRight,
      },
    ],
  },
  customBusiness: {
    title: "الأعمال المخصصة",
    icon: Briefcase,
    items: [
        {
            title: "الاشتراكات",
            href: "/subscriptions",
            icon: Repeat,
        },
        {
            title: "السكمنت",
            href: "/segments",
            icon: Layers3,
        },
        {
            title: "البورصات",
            href: "/exchanges",
            icon: Waypoints,
        },
        {
            title: "توزيع الحصص",
            href: "/profit-sharing",
            icon: Share2,
        },
        {
            title: "تحليل الطيران",
            href: "/reports/flight-analysis",
            icon: Plane,
        }
    ]
  },
  reports: {
    title: "التقارير والأدوات",
    icon: BarChart3,
    items: [
      { title: "تقرير الأرصدة", href: "/reports/debts", icon: BookCopy },
      { title: "كشف حساب", href: "/reports/account-statement", icon: NotebookText },
      { title: "الأرباح والخسائر", href: "/reports/profit-loss", icon: FileBarChart },
      { title: "تحليل الربحية", href: "/reports/profitability-analysis", icon: PieChart },
      { title: "التدفق النقدي", href: "/reports/cash-flow", icon: Waypoints },
      { title: "التدقيق الذكي", href: "/reconciliation", icon: Wand2 },
    ],
  },
    additionalFeatures: {
    title: "الميزات الإضافية",
    icon: Briefcase,
    items: [
      {
        title: "الصناديق",
        href: "/boxes",
        icon: Box,
      },
      {
        title: "الموردين",
        href: "/suppliers",
        icon: Building,
      },
      {
        title: "الملف الشخصي",
        href: "/profile",
        icon: User,
      },
      {
        title: "الأرباح",
        href: "/profits",
        icon: AreaChart,
      },
      {
        title: "الإشعارات",
        href: "/notifications",
        icon: BellRing,
      },
      {
        title: "إدارة الأصول",
        href: "/settings/assets",
        icon: Wallet,
      }
    ],
  },
  system: {
    title: "النظام",
    icon: Network,
    items: [
      { title: "الإعدادات العامة", href: "/settings", icon: Settings },
      { title: "الدليل المحاسبي والربط المالي", href: "/settings/accounting", icon: GitBranch },
      { title: "الموظفين والصلاحيات", href: "/users", icon: Users },
      { title: "الأدوات المالية", href: "/finance-tools", icon: Landmark },
      { title: "قوالب الرسائل", href: "/templates", icon: PenSquare },
      { title: "سجل النشاطات", href: "/system/activity-log", icon: FileTerminal },
      { title: "سجل الأخطاء", href: "/system/error-log", icon: FileCog },
      { title: "تدقيق البيانات", href: "/system/data-audit", icon: FileCheck2 },
      { title: "سجل المحذوفات", href: "/system/deleted-log", icon: FileX2 },
    ],
  },
};
