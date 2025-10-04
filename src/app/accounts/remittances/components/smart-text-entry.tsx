
"use client";

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, Save } from 'lucide-react';
import type { Remittance, RemittanceSettings } from '@/lib/types';
import { analyzeRemittanceText, type AnalyzeRemittanceOutput } from '@/ai/flows/analyze-remittance-text';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addRemittance } from '../actions';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { Autocomplete } from '@/components/ui/autocomplete';

interface SmartTextEntryProps {
    remittanceSettings: RemittanceSettings;
    onRemittanceAdded: (newRemittance: Remittance) => void;
}

const saveSchema = z.object({
  companyName: z.string().min(1, "اسم الشركة مطلوب"),
  officeName: z.string().min(1, "اسم المكتب مطلوب"),
  method: z.string().min(1, "طريقة التحويل مطلوبة"),
  assignedToUid: z.string().min(1, "المخول بالاستلام مطلوب"),
  boxId: z.string().min(1, "الصندوق المستلم مطلوب"),
  totalAmountUsd: z.coerce.number().default(0),
  totalAmountIqd: z.coerce.number().default(0),
  notes: z.string().optional(),
});
type SaveFormValues = z.infer<typeof saveSchema>;

export default function SmartTextEntry({ remittanceSettings, onRemittanceAdded }: SmartTextEntryProps) {
    const [analysisResult, setAnalysisResult] = useState<AnalyzeRemittanceOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [messageText, setMessageText] = useState('');
    const { toast } = useToast();
    const { data: navData } = useVoucherNav();
    const { user: currentUser } = useAuth();
    const userOptions = React.useMemo(() => (navData?.users || []).map(u => ({ value: u.uid, label: u.name })), [navData?.users]);

    const saveForm = useForm<SaveFormValues>({
        resolver: zodResolver(saveSchema),
         defaultValues: {
            totalAmountUsd: undefined,
            totalAmountIqd: undefined,
        }
    });

    React.useEffect(() => {
        if (analysisResult && currentUser && 'role' in currentUser && currentUser.boxId) {
            saveForm.setValue('boxId', currentUser.boxId);
        }
    }, [analysisResult, currentUser, saveForm]);

    const onAnalyze = async () => {
        if (!messageText.trim()) {
            toast({ title: "الرجاء إدخال نص الحوالة.", variant: 'destructive' });
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const result = await analyzeRemittanceText({ messageText });
            setAnalysisResult(result);
            saveForm.reset({
                companyName: result.companyName,
                method: result.method,
                notes: result.notes,
                totalAmountUsd: result.currency === 'dollar' ? result.amount : undefined,
                totalAmountIqd: result.currency === 'dinar' ? result.amount : undefined,
                officeName: '',
                assignedToUid: '',
                boxId: (currentUser && 'role' in currentUser) ? currentUser.boxId : ''
            });
        } catch (error: any) {
            toast({ title: "خطأ في التحليل", description: error.message, variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const onSave = async (data: SaveFormValues) => {
        const result = await addRemittance({
            ...data,
            distribution: {}, // Not supported in this simplified form
            totalAmountUsd: data.totalAmountUsd || 0,
            totalAmountIqd: data.totalAmountIqd || 0
        });
        if(result.success && result.newRemittance) {
            toast({title: "تمت إضافة الحوالة بنجاح"});
            onRemittanceAdded(result.newRemittance);
            setAnalysisResult(null);
            setMessageText('');
            saveForm.reset();
        } else {
            toast({title: "خطأ", description: result.error, variant: 'destructive'});
        }
    }
    
    return (
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary"/>
                    الإدخال الذكي للحوالات
                 </CardTitle>
                <CardDescription>أدخل نص الحوالة كما تكتبه في واتساب، وسيقوم النظام بتحليله.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                     <Label htmlFor="remittance-text">نص الحوالة</Label>
                    <Textarea 
                        id="remittance-text"
                        placeholder='مثال: فيوجر فلاي 720.000 ماستر' 
                        rows={4} 
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                    />
                </div>
                 <Button onClick={onAnalyze} disabled={isAnalyzing || !messageText.trim()} className="w-full">
                    {isAnalyzing ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Wand2 className="me-2 h-4 w-4" />}
                    تحليل النص
                </Button>
                
                 {analysisResult && (
                    <Form {...saveForm}>
                        <form onSubmit={saveForm.handleSubmit(onSave)} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                           <FormField control={saveForm.control} name="companyName" render={({ field }) => (<FormItem><Label>الشركة</Label><FormControl><Autocomplete searchAction='all' value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage/></FormItem>)} />
                           <div className="grid grid-cols-2 gap-4">
                             <FormField control={saveForm.control} name="totalAmountUsd" render={({ field }) => (<FormItem><Label>المبلغ (USD)</Label><FormControl><Input type="number" {...field} value={field.value || ''}/></FormControl><FormMessage/></FormItem>)} />
                             <FormField control={saveForm.control} name="totalAmountIqd" render={({ field }) => (<FormItem><Label>المبلغ (IQD)</Label><FormControl><Input type="number" {...field} value={field.value || ''}/></FormControl><FormMessage/></FormItem>)} />
                           </div>
                           <FormField control={saveForm.control} name="method" render={({ field }) => (<FormItem><Label>الطريقة</Label><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)} />
                           <FormField control={saveForm.control} name="officeName" render={({ field }) => (
                                <FormItem><Label>المكتب</Label><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر المكتب..." /></SelectTrigger></FormControl><SelectContent>{remittanceSettings.offices.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/>
                               </FormItem>
                           )}/>
                            <FormField control={saveForm.control} name="assignedToUid" render={({ field }) => (
                                <FormItem><Label>المخول بالاستلام</Label><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر موظفًا..." /></SelectTrigger></FormControl><SelectContent>{userOptions.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent></Select><FormMessage/>
                               </FormItem>
                           )}/>
                            <FormField control={saveForm.control} name="boxId" render={({ field }) => (
                                <FormItem><Label>الصندوق المستلم</Label><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر صندوقًا..." /></SelectTrigger></FormControl><SelectContent>{(navData?.boxes || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select><FormMessage/>
                               </FormItem>
                           )}/>
                           <FormField control={saveForm.control} name="notes" render={({ field }) => (<FormItem><Label>ملاحظات</Label><FormControl><Textarea {...field} /></FormControl><FormMessage/></FormItem>)} />

                           <Button type="submit" disabled={saveForm.formState.isSubmitting} className="w-full">
                               {saveForm.formState.isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                               حفظ الحوالة
                           </Button>
                        </form>
                    </Form>
                )}

            </CardContent>
        </Card>
    );
}

    
