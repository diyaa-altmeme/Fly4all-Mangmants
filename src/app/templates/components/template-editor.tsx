
'use client';

import * as React from 'react';
import type { MessageTemplate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { addMessageTemplate, updateMessageTemplate } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  name: z.string().min(3, "اسم القالب مطلوب."),
  content: z.string().min(10, "محتوى القالب مطلوب."),
});

type FormValues = z.infer<typeof formSchema>;

const availableVariables = [
  "{clientName}", "{invoiceNumber}", "{amount}", "{dueDate}", "{serviceName}"
];

interface TemplateEditorProps {
    selectedTemplate: MessageTemplate | null;
    onSaveSuccess: () => void;
    onClearSelection: () => void;
}

export default function TemplateEditor({ selectedTemplate, onSaveSuccess, onClearSelection }: TemplateEditorProps) {
    const { toast } = useToast();
    const isEditing = !!selectedTemplate;
    
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        values: {
            name: selectedTemplate?.name || '',
            content: selectedTemplate?.content || ''
        }
    });

    React.useEffect(() => {
        form.reset({
            name: selectedTemplate?.name || '',
            content: selectedTemplate?.content || ''
        });
    }, [selectedTemplate, form]);

    const { isSubmitting, control } = form;

    const handleSubmit = async (data: FormValues) => {
        try {
            let result;
            if (isEditing && selectedTemplate) {
                result = await updateMessageTemplate(selectedTemplate.id, data);
            } else {
                result = await addMessageTemplate(data);
            }
            if (result.success) {
                toast({ title: `تم ${isEditing ? 'تحديث' : 'حفظ'} القالب بنجاح` });
                onSaveSuccess();
            } else {
                throw new Error(result.error);
            }
        } catch(e: any) {
             toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
        }
    };
    
    const insertVariable = (variable: string) => {
        const currentContent = form.getValues('content');
        form.setValue('content', `${currentContent} ${variable}`);
    }

    return (
        <Card className="sticky top-24">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <CardHeader>
                        <CardTitle className="font-bold">{isEditing ? `تعديل قالب: ${selectedTemplate?.name}` : 'إنشاء قالب جديد'}</CardTitle>
                        <CardDescription>
                            استخدم المتغيرات أدناه لتخصيص الرسالة. سيتم استبدالها بالقيم الفعلية عند الإرسال.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <Label className="font-bold">اسم القالب</Label>
                                    <FormControl><Input placeholder="مثال: تذكير بالدفعة، تأكيد حجز..." {...field} /></FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <Label className="font-bold">محتوى الرسالة</Label>
                                    <FormControl><Textarea rows={10} placeholder="عزيزي {clientName}، نود تذكيركم..." {...field} /></FormControl>
                                     <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <div className="space-y-2">
                             <Label className="flex items-center gap-2 text-muted-foreground font-bold"><Info className="h-4 w-4"/> متغيرات متاحة (انقر للإضافة)</Label>
                            <div className="flex flex-wrap gap-2">
                                {availableVariables.map(variable => (
                                    <Badge key={variable} variant="secondary" className="cursor-pointer font-mono" onClick={() => insertVariable(variable)}>
                                        {variable}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-between">
                        <Button type="button" variant="ghost" onClick={onClearSelection}>مسح التحديد والبدء من جديد</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                            <Save className="me-2 h-4 w-4"/>
                            {isEditing ? 'حفظ التعديلات' : 'حفظ القالب'}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
