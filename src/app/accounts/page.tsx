import Link from "next/link";
import type { Metadata } from "next";
import type { ComponentType } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, FileText, Settings, Wallet, ArrowUpRight, BarChart3 } from "lucide-react";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/page-structure";

export const metadata: Metadata = {
  title: "مركز إدارة الحسابات",
  description: "وحدة مركزية لمتابعة الحوالات، السندات والإعدادات المحاسبية في النظام.",
};

type HubSection = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  primaryAction: { href: string; label: string };
  links: { href: string; label: string; description: string }[];
};

const sections: HubSection[] = [
  {
    id: "remittances",
    title: "الحوالات المالية",
    description:
      "مراقبة تدفقات الأموال بين الصناديق والشركات ومتابعة التوثيق والمراجعة بشكل فوري.",
    icon: ArrowRightLeft,
    primaryAction: { href: "/accounts/remittances", label: "فتح إدارة الحوالات" },
    links: [
      {
        href: "/reports/debts",
        label: "تقرير الأرصدة",
        description: "تحليل الذمم والالتزامات المرتبطة بالحوالات.",
      },
      {
        href: "/reports/boxes",
        label: "تقارير الصناديق",
        description: "متابعة أرصدة الصناديق التي تستقبل أو ترسل حوالات.",
      },
      {
        href: "/reports/account-statement",
        label: "كشف حساب مباشر",
        description: "عرض الأثر المالي لكل حوالة على حساب معين.",
      },
    ],
  },
  {
    id: "vouchers",
    title: "السندات المالية",
    description:
      "إدارة سندات القبض والدفع والمصاريف وسندات القيد الداخلي مع خيارات التصفية المتقدمة.",
    icon: FileText,
    primaryAction: { href: "/accounts/vouchers/list", label: "استعراض سجل السندات" },
    links: [
      {
        href: "/accounts/vouchers",
        label: "مركز السندات",
        description: "إدارة إجراءات إنشاء أنواع السندات المختلفة.",
      },
      {
        href: "/accounts/vouchers/list",
        label: "تخصيص عرض السندات",
        description: "ضبط الأعمدة والتصفية الافتراضية لسجل السندات.",
      },
      {
        href: "/finance/overview",
        label: "لوحة المتابعة المالية",
        description: "ربط حركة السندات بتقارير الأداء المالي الشامل.",
      },
    ],
  },
  {
    id: "settings",
    title: "الإعدادات المحاسبية",
    description:
      "تهيئة الدليل المحاسبي وربط الحسابات مع وحدات النظام المختلفة لضمان دقة القيود.",
    icon: Settings,
    primaryAction: { href: "/settings/accounting", label: "إدارة الإعدادات المحاسبية" },
    links: [
      {
        href: "/settings/accounting/chart-of-accounts",
        label: "الدليل المحاسبي",
        description: "إعادة هيكلة الحسابات وتصنيفها حسب احتياجات المنشأة.",
      },
      {
        href: "/settings/accounting",
        label: "ربط الحسابات",
        description: "تحديد حسابات الصناديق والخدمات المتصلة بالمنصة.",
      },
      {
        href: "/reports/advanced",
        label: "تقارير متقدمة",
        description: "تحليل تفصيلي للمخرجات المحاسبية بعد تطبيق الربط.",
      },
    ],
  },
];

const quickLinks = [
  {
    href: "/finance/overview",
    label: "النظرة المالية الشاملة",
    description: "تجميع بيانات الحوالات والسندات والتقارير في لوحة واحدة.",
    icon: BarChart3,
  },
  {
    href: "/accounts/remittances",
    label: "إضافة حوالة جديدة",
    description: "الوصول السريع إلى واجهة تسجيل حوالة وتأكيد الاستلام.",
    icon: ArrowRightLeft,
  },
  {
    href: "/accounts/vouchers/list",
    label: "تحديث سجل السندات",
    description: "عرض أحدث السندات مع خيارات الفلترة والحفظ.",
    icon: FileText,
  },
];

export default function AccountsManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="الحسابات"
        title="مركز إدارة الحسابات"
        description="نقطة الانطلاق الموحدة لكل ما يتعلق بالحوالات، السندات، والتهيئة المحاسبية."
        actions={(
          <Button asChild className="gap-2" size="lg">
            <Link href="/finance/overview">
              <BarChart3 className="h-4 w-4" />
              عرض الأداء المالي
            </Link>
          </Button>
        )}
      />

      <PageSection>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold sm:text-2xl">روابط سريعة</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              وصول مباشر للمهام المتكررة داخل وحدة الحسابات.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col rounded-xl border border-border/40 bg-muted/20 p-4 transition hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{link.description}</span>
                <link.icon className="h-5 w-5 text-primary transition group-hover:translate-x-1" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-base font-semibold sm:text-lg">{link.label}</span>
                <ArrowUpRight className="h-4 w-4 opacity-60 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold sm:text-2xl">الوحدات المرتبطة</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            استعرض الوحدات المحاسبية الأساسية وتابع المهام المرتبطة بكل وحدة.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <Card key={section.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between text-primary">
                  <section.icon className="h-5 w-5" />
                  <Wallet className="h-5 w-5 opacity-20" />
                </div>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group flex items-start justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 transition hover:border-primary hover:bg-primary/5"
                      >
                        <div>
                          <p className="font-medium">{link.label}</p>
                          <p className="text-muted-foreground text-xs">{link.description}</p>
                        </div>
                        <ArrowUpRight className="mt-1 h-4 w-4 text-muted-foreground transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full justify-between">
                  <Link href={section.primaryAction.href}>
                    <span>{section.primaryAction.label}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </PageSection>
    </PageContainer>
  );
}
