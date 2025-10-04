
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { getSequences, updateSequence } from '@/lib/sequences';
import type { VoucherSequence } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { produce } from 'immer';


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
                <CardTitle>عدادات الفواتير</CardTitle>
                <CardDescription>
                   الرقم التالي في التسلسل سيكون الرقم الظاهر هنا + 1. قم بتعديل البادئة أو الرقم ثم اضغط حفظ للصف.
                </CardDescription>
            </CardHeader>
            <CardContent>
               {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
               ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>نوع السند</TableHead>
                                <TableHead>البادئة الحالية</TableHead>
                                <TableHead>الرقم الحالي</TableHead>
                                <TableHead>تعديل البادئة</TableHead>
                                <TableHead>إعادة تعيين الرقم</TableHead>
                                <TableHead className="text-center">إجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sequences.map(seq => (
                                <TableRow key={seq.id}>
                                    <TableCell className="font-semibold">{seq.label}</TableCell>
                                    <TableCell className="font-mono text-primary">{seq.prefix}</TableCell>
                                    <TableCell className="font-mono">{seq.value}</TableCell>
                                    <TableCell>
                                        <Input 
                                            value={seq.prefix}
                                            onChange={(e) => handleFieldChange(seq.id, 'prefix', e.target.value)}
                                            className="w-24 font-mono"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={seq.value}
                                            onChange={(e) => handleFieldChange(seq.id, 'value', e.target.value)}
                                            className="w-32 font-mono"
                                        />
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
               )}
            </CardContent>
        </Card>
    );
}
