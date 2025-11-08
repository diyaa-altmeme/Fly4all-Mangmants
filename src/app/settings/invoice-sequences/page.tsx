
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, ArrowLeft, GitBranch, FileText, Repeat, Waypoints, Share2, Ticket, Users } from 'lucide-react';
import { getSequences, updateSequence } from '@/lib/sequences';
import type { VoucherSequence } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { produce } from 'immer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const sequenceGroups = [
    {
        id: 'vouchers',
        title: 'السندات الأساسية',
        icon: FileText,
        prefixes: ['RC', 'PV', 'EX', 'DS', 'JE', 'TR']
    },
    {
        id: 'operations',
        title: 'العمليات الرئيسية',
        icon: Ticket,
        prefixes: ['BK', 'VS', 'RF', 'EXC', 'VOID']
    },
    {
        id: 'segments',
        title: 'السكمنت',
        icon: GitBranch,
        prefixes: ['SEG', 'COMP', 'PARTNER']
    },
    {
        id: 'subscriptions',
        title: 'الاشتراكات',
        icon: Repeat,
        prefixes: ['SUB', 'SUBP']
    },
    {
        id: 'exchanges',
        title: 'البورصات',
        icon: Waypoints,
        prefixes: ['EXT', 'EXP']
    },
    {
        id: 'profits',
        title: 'الأرباح والعلاقات',
        icon: Share2,
        prefixes: ['PR', 'PROFIT-SHARING', 'CL']
    },
];


export default function InvoiceSequencesPage() {
    const [sequences, setSequences] = useState<VoucherSequence[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getSequences();
            setSequences(data);
        } catch (err) {
            toast({ title: 'خطأ', description: 'فشل تحميل بيانات التسلسل.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFieldChange = (id: string, key: 'prefix' | 'value', value: string) => {
        const processedValue = key === 'value' ? parseInt(value, 10) || 0 : value.toUpperCase();
        setSequences(produce(draft => {
            const sequence = draft.find(s => s.id === id);
            if (sequence) {
                (sequence as any)[key] = processedValue;
            }
        }));
    };
    
    const handleSave = async (sequence: VoucherSequence) => {
        setIsSaving(prev => ({...prev, [sequence.id]: true}));
        try {
            const result = await updateSequence(sequence.id, {
                prefix: sequence.prefix,
                value: sequence.value,
                label: sequence.label
            });
            if (result.success) {
                toast({ title: `تم تحديث تسلسل "${sequence.label}"` });
            } else {
                 toast({ title: "خطأ", description: result.error, variant: 'destructive' });
            }
        } catch(e: any) {
            toast({ title: "خطأ", description: e.message, variant: "destructive" });
        }
        finally {
            setIsSaving(prev => ({...prev, [sequence.id]: false}));
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>عدادات الفواتير والتسلسل الرقمي</CardTitle>
                <CardDescription>
                   تحكم في البادئات والأرقام الحالية لكل نوع من أنواع المستندات في النظام. الرقم التالي سيكون الرقم الحالي + 1.
                </CardDescription>
            </CardHeader>
            <CardContent>
               {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
               ) : (
                <Accordion type="multiple" defaultValue={['vouchers', 'operations']} className="w-full space-y-2">
                    {sequenceGroups.map(group => {
                        const groupSequences = sequences.filter(s => group.prefixes.includes(s.id));
                        if (groupSequences.length === 0) return null;
                        const Icon = group.icon;

                        return (
                            <AccordionItem value={group.id} key={group.id} className="border rounded-lg bg-background">
                                <AccordionTrigger className="px-4 py-3 font-bold hover:no-underline">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-5 w-5 text-primary" />
                                        {group.title}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pb-2">
                                    <div className="border-t">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-1/3">نوع السند</TableHead>
                                                    <TableHead className="w-1/6">البادئة</TableHead>
                                                    <TableHead className="w-1/6">الرقم الحالي</TableHead>
                                                    <TableHead className="w-1/4">تعديل</TableHead>
                                                    <TableHead className="text-center">حفظ</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                 {groupSequences.map(seq => (
                                                    <TableRow key={seq.id}>
                                                        <TableCell className="font-semibold">{seq.label}</TableCell>
                                                        <TableCell className="font-mono text-primary">{seq.prefix}</TableCell>
                                                        <TableCell className="font-mono">{seq.value}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Input 
                                                                    value={seq.prefix}
                                                                    onChange={(e) => handleFieldChange(seq.id, 'prefix', e.target.value)}
                                                                    className="w-24 h-8 font-mono"
                                                                />
                                                                <Input
                                                                    type="number"
                                                                    value={seq.value}
                                                                    onChange={(e) => handleFieldChange(seq.id, 'value', e.target.value)}
                                                                    className="w-32 h-8 font-mono"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Button size="sm" onClick={() => handleSave(seq)} disabled={isSaving[seq.id]}>
                                                                {isSaving[seq.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4"/>}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
               )}
            </CardContent>
        </Card>
    );
}

