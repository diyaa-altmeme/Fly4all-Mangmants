
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit } from 'lucide-react';
import AddEditWorkTypeDialog from './add-edit-work-type-dialog';
import type { WorkType, AppSettings } from '@/lib/types';
import { saveWorkTypes } from './actions';
import { useToast } from '@/hooks/use-toast';
import { produce } from 'immer';

interface WorkTypesSettingsProps {
    workTypes: WorkType[];
    onSettingsChanged: () => void;
}

export default function WorkTypesSettings({ workTypes: initialWorkTypes = [], onSettingsChanged = () => {} }: WorkTypesSettingsProps) {
    const [workTypes, setWorkTypes] = useState(initialWorkTypes);
    const { toast } = useToast();

     useEffect(() => {
        setWorkTypes(initialWorkTypes || []);
    }, [initialWorkTypes]);

    const onWorkTypeSave = async (workType: WorkType) => {
        const newWorkTypes = produce(workTypes, draft => {
            const index = draft.findIndex(wt => wt.id === workType.id);
            if (index !== -1) {
                draft[index] = workType;
            } else {
                draft.push(workType);
            }
        });
        
        const result = await saveWorkTypes(newWorkTypes);
        if(result.success) {
            setWorkTypes(newWorkTypes);
            onSettingsChanged();
        } else {
             toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    }
    
    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">أنواع العمل</h2>
                    <p className="text-sm text-muted-foreground">تصنيف الشركات بناءً على طبيعة العمل (وكيل، موزع...).</p>
                </div>
                 <AddEditWorkTypeDialog onSave={onWorkTypeSave}>
                    <Button size="sm">
                        <PlusCircle className="me-2 h-4 w-4"/> إضافة نوع عمل
                    </Button>
                </AddEditWorkTypeDialog>
            </div>
            
            <div className="border rounded-lg">
                 <Table>
                    <TableHeader>
                        <TableRow><TableHead>الاسم</TableHead><TableHead>ينطبق على</TableHead><TableHead className="w-[50px]"> </TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                        {workTypes.map(wt => (
                             <TableRow key={wt.id}>
                                <TableCell className="font-semibold">{wt.name}</TableCell>
                                <TableCell className="space-x-1 space-x-reverse">
                                    {wt.appliesTo.map(t => <Badge key={t} variant="secondary">{t === 'client' ? 'عميل' : 'مورد'}</Badge>)}
                                </TableCell>
                                 <TableCell>
                                    <AddEditWorkTypeDialog onSave={onWorkTypeSave} isEditing workType={wt}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4"/></Button>
                                    </AddEditWorkTypeDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </div>
        </div>
    );
}
