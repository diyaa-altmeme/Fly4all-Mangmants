
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
  BookUser,
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
  GanttChartSquare,
  FileTerminal,
  FileCogIcon,
  FileCheck2,
  FileX2,
  PenSquare,
  Landmark,
} from "lucide-react";

export const navConfig = {
  mainNav: [
    {
      title: "الرئيسية",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
  ],
  relations: {
    title: "العلاقات",
    icon: Contact,
    items: [
      {
        title: "العملاء والموردين",
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
      { title: "تقرير الأرصدة", href: "/reports/debts", icon: BookUser },
      { title: "كشف حساب", href: "/reports/account-statement", icon: NotebookText },
      { title: "الأرباح والخسائر", href: "/reports/profit-loss", icon: GanttChartSquare },
      { title: "تحليل الربحية", href: "/reports/profitability-analysis", icon: PieChart },
      { title: "التدفق النقدي", href: "/reports/cash-flow", icon: Waypoints },
      { title: "التدقيق الذكي", href: "/reconciliation", icon: Wand2 },
    ],
  },
  system: {
    title: "النظام",
    icon: Network,
    items: [
      { title: "الإعدادات العامة", href: "/settings", icon: Settings },
      { title: "الموظفين والصلاحيات", href: "/users", icon: Users },
      { title: "الأدوات المالية", href: "/finance-tools", icon: Landmark },
      { title: "قوالب الرسائل", href: "/templates", icon: PenSquare },
      { title: "سجل النشاطات", href: "/system/activity-log", icon: FileTerminal },
      { title: "سجل الأخطاء", href: "/system/error-log", icon: FileCogIcon },
      { title: "تدقيق البيانات", href: "/system/data-audit", icon: FileCheck2 },
      { title: "سجل المحذوفات", href: "/system/deleted-log", icon: FileX2 },
    ],
  },
};
