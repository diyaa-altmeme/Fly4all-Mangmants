import { LayoutDashboard, Plane, Wallet, Briefcase, BarChart3, Users, Settings } from "lucide-react";

export const NAV_CONFIG = [
  {
    id: "operations",
    label: "العمليات",
    icon: Plane,
    activeRoutes: ["/bookings", "/visas", "/accounts/remittances"],
    items: [
      { href: "/bookings", label: "حجوزات الطيران", permission: "bookings:read" },
      { href: "/visas", label: "حجوزات الفيزا", permission: "visas:read" },
      { href: "/accounts/remittances", label: "الحوالات", permission: "remittances:read" },
    ],
  },
  {
    id: "accounting",
    label: "المحاسبة",
    icon: Wallet,
    activeRoutes: ["/accounts/vouchers", "/boxes", "/settings/advanced-accounts-setup"],
    items: [
      { href: "/accounts/vouchers/list", label: "سجل السندات", permission: "vouchers:read" },
      { href: "/boxes", label: "الصناديق", permission: "admin" }, // Assuming admin only
      { href: "/settings/accounting", label: "الدليل المحاسبي", permission: "admin" },
    ],
  },
  {
    id: "custom-business",
    label: "الأعمال المخصصة",
    icon: Briefcase,
    activeRoutes: ["/subscriptions", "/segments", "/exchanges", "/profit-sharing"],
    items: [
      { href: "/subscriptions", label: "الاشتراكات", permission: "subscriptions:read" },
      { href: "/segments", label: "السكمنت", permission: "segments:read" },
      { href: "/exchanges", label: "البورصات", permission: "admin" },
      { href: "/profit-sharing", label: "توزيع الحصص", permission: "admin" },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    icon: BarChart3,
    activeRoutes: ["/reports"],
    items: [
      { href: "/reports/account-statement", label: "كشف الحساب", permission: "reports:account_statement" },
      { href: "/reports/debts", label: "الأرصدة", permission: "reports:debts" },
      { href: "/reports/profit-loss", label: "الأرباح والخسائر", permission: "reports:profits" },
      { href: "/reports/cash-flow", label: "التدفق النقدي", permission: "reports:debts" },
    ],
  },
  {
    id: "relations",
    label: "العلاقات",
    icon: Users,
    activeRoutes: ["/clients", "/suppliers", "/chat"],
    items: [
      { href: "/clients", label: "العملاء والموردين", permission: "relations:read" },
      { href: "/chat", label: "المحادثات", permission: "public" }, // Assuming public access for authenticated users
    ],
  },
  {
    id: "settings",
    label: "الإعدادات والأدوات",
    icon: Settings,
    activeRoutes: ["/settings", "/system", "/users", "/templates", "/finance-tools"],
    items: [
      { href: "/settings", label: "الإعدادات العامة", permission: "admin" },
      { href: "/users", label: "الموظفين والصلاحيات", permission: "users:read" },
      { href: "/system/activity-log", label: "سجل النشاطات", permission: "admin" },
      { href: "/finance-tools", label: "الأدوات المالية", permission: "admin" },
    ],
  },
];
