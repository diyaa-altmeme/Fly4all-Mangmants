
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BellRing, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

// Sample data, to be replaced with data from an API
const announcements = [
    { id: 1, title: 'تحديثات النظام - إصدار 1.2.0', date: '2024-06-15', content: 'تم إضافة ميزات جديدة لتقارير الأرباح وتحسينات في الأداء.', tag: 'تحديثات', tagColor: 'bg-blue-500' },
    { id: 2, title: 'صيانة مجدولة', date: '2024-06-12', content: 'سيتم إجراء صيانة للنظام يوم الجمعة القادم من الساعة 2 صباحًا حتى 3 صباحًا.', tag: 'هام', tagColor: 'bg-red-500' },
    { id: 3, title: 'ورشة عمل جديدة', date: '2024-06-10', content: 'انضموا إلينا في ورشة عمل حول استخدام أدوات التدقيق الذكي.', tag: 'تدريب', tagColor: 'bg-green-500' },
    { id: 4, title: 'نصيحة اليوم', date: '2024-06-09', content: 'استخدم اختصار Ctrl + B لفتح وإغلاق الشريط الجانبي بسرعة!', tag: 'نصائح', tagColor: 'bg-yellow-500 text-black' },
];

export default function Announcements() {
  return (
    <Card className="h-full flex flex-col">
        <CardHeader>
            <div className="flex items-center justify-between">
                 <Button asChild variant="outline" size="sm">
                    <Link href="#">عرض الكل</Link>
                 </Button>
                <div className="text-right">
                    <CardTitle className="flex items-center justify-end gap-2"><BellRing /> الإعلانات والتبليغات</CardTitle>
                    <CardDescription>آخر الأخبار والتحديثات الهامة من إدارة النظام.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
                 <div className="space-y-4">
                    {announcements.map((item) => (
                        <div key={item.id} className="p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex flex-col items-start gap-1 flex-shrink-0">
                                     <Badge className={item.tagColor}>{item.tag}</Badge>
                                     <span className="text-xs text-muted-foreground">{item.date}</span>
                                </div>
                                <div className="text-right">
                                    <h4 className="font-bold">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground">{item.content}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
  )
}
