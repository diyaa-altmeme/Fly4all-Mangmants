
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, PlusCircle, Trash2, Palette, Info, Paintbrush, Upload, ImageIcon, Image as ImageIconLucide } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { produce } from 'immer';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, LandingPageSettings, LandingPageFeature, LandingPagePartner, LandingPageFaqItem } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

interface LandingPageSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

const SectionCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Card className="shadow-sm">
        <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {children}
        </CardContent>
    </Card>
);

const FeatureEditor = ({ feature, onFeatureChange }: { feature: LandingPageFeature, onFeatureChange: (updatedFeature: LandingPageFeature) => void }) => (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
        <div className="space-y-1"><Label>العنوان</Label><Input value={feature.title} onChange={(e) => onFeatureChange({ ...feature, title: e.target.value })} /></div>
        <div className="space-y-1"><Label>الوصف</Label><Textarea value={feature.description} onChange={(e) => onFeatureChange({ ...feature, description: e.target.value })} /></div>
        <div className="space-y-1"><Label>رابط الصورة</Label><Input value={feature.imageUrl} onChange={(e) => onFeatureChange({ ...feature, imageUrl: e.target.value })} /></div>
    </div>
);

export default function LandingPageSettingsComponent({ settings: initialSettings, onSettingsChanged }: LandingPageSettingsProps) {
    const [settings, setSettings] = useState<Partial<LandingPageSettings>>(initialSettings.theme?.landingPage || {});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setSettings(initialSettings.theme?.landingPage || {});
    }, [initialSettings]);

    const handleChange = (key: keyof LandingPageSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleNestedChange = (section: keyof LandingPageSettings, key: string, value: any) => {
        setSettings(produce(draft => {
            if (!draft[section]) draft[section] = {} as any;
            (draft[section] as any)[key] = value;
        }));
    };

    const handleFeatureChange = (featureName: keyof LandingPageSettings, updatedFeature: LandingPageFeature) => {
        setSettings(produce(draft => {
            (draft as any)[featureName] = updatedFeature;
        }));
    }
    
    const handleFaqChange = (index: number, key: 'question' | 'answer', value: string) => {
        setSettings(produce(draft => {
            if (draft.faqSection?.faqs) {
                draft.faqSection.faqs[index][key] = value;
            }
        }));
    };

    const handleAddFaq = () => {
        setSettings(produce(draft => {
            if (!draft.faqSection) draft.faqSection = { title: 'الأسئلة الشائعة', description: '', faqs: [] };
            if (!draft.faqSection.faqs) draft.faqSection.faqs = [];
            draft.faqSection.faqs.push({ question: 'سؤال جديد', answer: 'جواب جديد' });
        }));
    };
    
    const handleRemoveFaq = (index: number) => {
        setSettings(produce(draft => {
            if (draft.faqSection?.faqs) {
                draft.faqSection.faqs.splice(index, 1);
            }
        }));
    };
    
    const handlePartnerChange = (index: number, key: 'name' | 'logoUrl', value: string) => {
        setSettings(produce(draft => {
            if(draft.partnersSection?.partners) {
                draft.partnersSection.partners[index][key] = value;
            }
        }));
    };
    
    const handleAddPartner = () => {
         setSettings(produce(draft => {
            if (!draft.partnersSection) draft.partnersSection = { title: 'شركاؤنا', description: '', partners: [] };
            if (!draft.partnersSection.partners) draft.partnersSection.partners = [];
            draft.partnersSection.partners.push({ name: 'شريك جديد', logoUrl: '' });
        }));
    };
    
    const handleRemovePartner = (index: number) => {
        setSettings(produce(draft => {
            if(draft.partnersSection?.partners) {
                draft.partnersSection.partners.splice(index, 1);
            }
        }));
    };


    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateSettings({ theme: { ...initialSettings.theme, landingPage: settings } });
        if(result.success) {
            toast({ title: "تم حفظ إعدادات الواجهة بنجاح" });
            onSettingsChanged();
        } else {
            toast({ title: 'خطأ', description: "لم يتم حفظ الإعدادات.", variant: 'destructive' });
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>قسم الهيرو الرئيسي</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>العنوان الرئيسي</Label><Input value={settings.heroTitle || ''} onChange={(e) => handleChange('heroTitle', e.target.value)} /></div>
                        <div className="space-y-1.5"><Label>العنوان الفرعي</Label><Input value={settings.heroSubtitle || ''} onChange={(e) => handleChange('heroSubtitle', e.target.value)} /></div>
                        <div className="space-y-1.5"><Label>لون العنوان</Label><Input value={settings.heroTitleColor || ''} onChange={(e) => handleChange('heroTitleColor', e.target.value)} /></div>
                        <div className="space-y-1.5"><Label>لون العنوان الفرعي</Label><Input value={settings.heroSubtitleColor || ''} onChange={(e) => handleChange('heroSubtitleColor', e.target.value)} /></div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>أقسام الميزات الرئيسية</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FeatureEditor feature={settings.smartTickets!} onFeatureChange={f => handleFeatureChange('smartTickets', f)} />
                    <FeatureEditor feature={settings.sourceAuditing!} onFeatureChange={f => handleFeatureChange('sourceAuditing', f)} />
                    <FeatureEditor feature={settings.financialManagement!} onFeatureChange={f => handleFeatureChange('financialManagement', f)} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>قسم إدارة الديون</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5"><Label>العنوان</Label><Input value={settings.accountStatements?.title || ''} onChange={e => handleNestedChange('accountStatements', 'title', e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>الوصف</Label><Textarea value={settings.accountStatements?.description || ''} onChange={e => handleNestedChange('accountStatements', 'description', e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>رابط الصورة</Label><Input value={settings.accountStatements?.imageUrl || ''} onChange={e => handleNestedChange('accountStatements', 'imageUrl', e.target.value)} /></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>قسم التحليل المالي</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5"><Label>العنوان</Label><Input value={settings.financialAnalysis?.title || ''} onChange={e => handleNestedChange('financialAnalysis', 'title', e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>الوصف</Label><Textarea value={settings.financialAnalysis?.description || ''} onChange={e => handleNestedChange('financialAnalysis', 'description', e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>رابط الصورة</Label><Input value={settings.financialAnalysis?.imageUrl || ''} onChange={e => handleNestedChange('financialAnalysis', 'imageUrl', e.target.value)} /></div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>قسم الخدمات</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-1.5"><Label>العنوان</Label><Input value={settings.servicesSection?.title || ''} onChange={e => handleNestedChange('servicesSection', 'title', e.target.value)} /></div>
                   <div className="space-y-1.5"><Label>الوصف</Label><Textarea value={settings.servicesSection?.description || ''} onChange={e => handleNestedChange('servicesSection', 'description', e.target.value)} /></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>قسم الشركاء</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-1.5"><Label>العنوان</Label><Input value={settings.partnersSection?.title || ''} onChange={e => handleNestedChange('partnersSection', 'title', e.target.value)} /></div>
                   <div className="space-y-1.5"><Label>الوصف</Label><Textarea value={settings.partnersSection?.description || ''} onChange={e => handleNestedChange('partnersSection', 'description', e.target.value)} /></div>
                   <Separator />
                    {(settings.partnersSection?.partners || []).map((partner, index) => (
                        <div key={index} className="space-y-2 p-3 border rounded-md relative">
                           <Button variant="ghost" size="icon" className="absolute top-1 left-1 h-7 w-7 text-destructive" onClick={() => handleRemovePartner(index)}><Trash2 className="h-4 w-4"/></Button>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-1"><Label>اسم الشريك</Label><Input value={partner.name} onChange={e => handlePartnerChange(index, 'name', e.target.value)} /></div>
                               <div className="space-y-1"><Label>رابط الشعار</Label><Input value={partner.logoUrl} onChange={e => handlePartnerChange(index, 'logoUrl', e.target.value)} /></div>
                           </div>
                       </div>
                   ))}
                   <Button variant="outline" size="sm" onClick={handleAddPartner}><PlusCircle className="me-2 h-4 w-4" /> إضافة شريك</Button>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader><CardTitle>قسم الأسئلة الشائعة</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1.5"><Label>العنوان</Label><Input value={settings.faqSection?.title || ''} onChange={e => handleNestedChange('faqSection', 'title', e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>الوصف</Label><Textarea value={settings.faqSection?.description || ''} onChange={e => handleNestedChange('faqSection', 'description', e.target.value)} /></div>
                    <Separator/>
                    {(settings.faqSection?.faqs || []).map((faq, index) => (
                         <div key={index} className="space-y-2 p-3 border rounded-md relative">
                            <Button variant="ghost" size="icon" className="absolute top-1 left-1 h-7 w-7 text-destructive" onClick={() => handleRemoveFaq(index)}><Trash2 className="h-4 w-4"/></Button>
                            <div className="space-y-1"><Label>السؤال</Label><Input value={faq.question} onChange={e => handleFaqChange(index, 'question', e.target.value)} /></div>
                            <div className="space-y-1"><Label>الجواب</Label><Textarea value={faq.answer} onChange={e => handleFaqChange(index, 'answer', e.target.value)} /></div>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddFaq}><PlusCircle className="me-2 h-4 w-4" /> إضافة سؤال</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>تذييل الصفحة</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-1.5"><Label>رابط صورة الخلفية</Label><Input value={settings.footerImageUrl || ''} onChange={e => handleChange('footerImageUrl', e.target.value)} /></div>
                </CardContent>
            </Card>

            <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ كل التغييرات
                </Button>
            </div>
        </div>
    );
}
