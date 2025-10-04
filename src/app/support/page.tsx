
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { LifeBuoy, Mail, MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const faqItems = [
    {
        question: 'كيف يمكنني إضافة حجز جديد؟',
        answer: 'من صفحة "الحجوزات"، اضغط على زر "إضافة حجز جديد" واتبع الخطوات في النموذج. يمكنك أيضًا استخدام الإدخال السريع أو الذكي من نفس الصفحة.',
    },
    {
        question: 'ما الفرق بين سند القبض العادي والمخصص؟',
        answer: 'سند القبض العادي يستخدم لاستلام مبلغ وتسجيله مباشرة في حساب واحد (مثل صندوق). أما السند المخصص، فيتيح لك توزيع المبلغ المستلم على عدة حسابات فرعية (مثل الفروع أو حسابات الشركاء) بالإضافة إلى تسوية جزء من حساب الدافع.',
    },
    {
        question: 'كيف يمكنني تغيير كلمة المرور الخاصة بي؟',
        answer: 'اذهب إلى صفحة "الملف الشخصي" من القائمة المنسدلة لاسمك في الأعلى، ثم ستجد خيار "تغيير كلمة المرور".',
    },
    {
        question: 'لماذا لا يمكنني رؤية بعض الصفحات مثل "إدارة المستخدمين"؟',
        answer: 'الوصول للصفحات يعتمد على الصلاحيات الممنوحة لدورك. إذا كنت تحتاج الوصول لصفحة معينة، يرجى مراجعة مدير النظام لمنحك الصلاحية المناسبة.',
    },
];

const SupportCard = ({ icon: Icon, title, description, buttonText, buttonAction }: { icon: React.ElementType, title: string, description: string, buttonText: string, buttonAction: () => void }) => (
    <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
             <div className="p-3 bg-muted rounded-full">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
            <Button className="w-full" onClick={buttonAction}>{buttonText}</Button>
        </CardContent>
    </Card>
);

export default function SupportPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <LifeBuoy className="mx-auto h-16 w-16 text-primary" />
                <h1 className="mt-4 text-3xl font-bold tracking-tight">مركز الدعم والمساعدة</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    هنا لمساعدتك. ابحث عن إجابات لأسئلتك أو تواصل معنا مباشرة.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5"/>
                        الأسئلة الشائعة
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {faqItems.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`} className="border-b">
                                <AccordionTrigger className="py-4 text-base text-right font-semibold hover:no-underline">{faq.question}</AccordionTrigger>
                                <AccordionContent className="pb-4 pt-0 text-muted-foreground text-right">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>

            <div className="text-center">
                 <h2 className="text-2xl font-bold">لم تجد ما تبحث عنه؟</h2>
                 <p className="mt-2 text-muted-foreground">فريق الدعم لدينا جاهز للمساعدة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <SupportCard
                    icon={MessageCircle}
                    title="دردشة مباشرة"
                    description="تحدث مباشرة مع أحد ممثلي الدعم لدينا."
                    buttonText="بدء الدردشة"
                    buttonAction={() => alert("ميزة الدردشة المباشرة قيد التطوير.")}
                />
                 <SupportCard
                    icon={Mail}
                    title="الدعم عبر البريد الإلكتروني"
                    description="أرسل لنا استفسارك وسنقوم بالرد في أقرب وقت ممكن."
                    buttonText="إرسال بريد إلكتروني"
                    buttonAction={() => window.location.href = 'mailto:support@mudarib.com'}
                />
            </div>
        </div>
    );
}
