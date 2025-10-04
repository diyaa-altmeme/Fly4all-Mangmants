import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Wrench } from "lucide-react";

const features = [
  "نظام صلاحيات متكامل للمستخدمين",
  "تكامل مع أنظمة حجز الفنادق",
  "تطبيق موبايل للمتابعة السريعة",
  "تقارير تحليلية متقدمة",
  "إدارة عروض الأسعار والفواتير",
];

export default function ComingSoonPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الميزات القادمة</h1>
        <p className="text-muted-foreground">
          نظرة على ما نعمل عليه حاليًا لتقديمه في الإصدارات المستقبلية.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            تحت التطوير
          </CardTitle>
          <CardDescription>
            قائمة بالميزات والتحسينات التي يتم العمل عليها حاليًا لتكون متاحة قريبًا.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 list-disc pr-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-500 mt-1 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
