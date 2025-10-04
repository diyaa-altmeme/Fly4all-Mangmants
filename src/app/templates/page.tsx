'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { MessageTemplate } from '@/lib/types';
import { getMessageTemplates, deleteMessageTemplate } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { List, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import TemplateEditor from './components/template-editor';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
    const { toast } = useToast();

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getMessageTemplates();
            setTemplates(data);
        } catch (error: any) {
            toast({ title: 'خطأ', description: 'فشل تحميل قوالب الرسائل.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);
    
    const handleDelete = async (id: string) => {
        const result = await deleteMessageTemplate(id);
        if(result.success) {
            toast({title: 'تم حذف القالب'});
            fetchTemplates();
            setSelectedTemplate(null);
        } else {
             toast({title: 'خطأ', description: result.error, variant: 'destructive'});
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6 items-start">
            <div className="space-y-4">
                <h1 className="text-2xl font-bold tracking-tight">قوالب الرسائل</h1>
                <p className="text-muted-foreground">
                    إدارة قوالب الرسائل الجاهزة التي يمكن استخدامها في الحملات والإشعارات.
                </p>
                <div className="border rounded-lg bg-background">
                    {loading ? (
                         <div className="p-4 space-y-2">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : (
                        <div className="p-2">
                             {templates.map(template => (
                                <div key={template.id} className={cn(
                                    "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted",
                                    selectedTemplate?.id === template.id && "bg-muted"
                                )}>
                                    <button className="flex items-center gap-2 text-right w-full" onClick={() => setSelectedTemplate(template)}>
                                        <MessageSquare className="h-4 w-4 text-muted-foreground"/>
                                        <span className="font-semibold">{template.name}</span>
                                    </button>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                                <AlertDialogDescription>سيتم حذف القالب بشكل دائم.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(template.id)} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، احذف</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div>
                 <TemplateEditor 
                    selectedTemplate={selectedTemplate}
                    onSaveSuccess={fetchTemplates}
                    onClearSelection={() => setSelectedTemplate(null)}
                />
            </div>
        </div>
    );
}
