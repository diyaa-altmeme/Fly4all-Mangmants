
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit } from 'lucide-react';
import AddEditGroupDialog from './add-edit-group-dialog';
import type { CompanyGroup, AppSettings } from '@/lib/types';
import { saveGroups } from './actions';
import { useToast } from '@/hooks/use-toast';
import { produce } from 'immer';

interface GroupsSettingsProps {
    companyGroups: CompanyGroup[];
    onSettingsChanged: () => void;
}

export default function GroupsSettings({ companyGroups: initialGroups = [], onSettingsChanged = () => {} }: GroupsSettingsProps) {
    const [groups, setGroups] = useState(initialGroups);
    const { toast } = useToast();

    useEffect(() => {
        setGroups(initialGroups || []);
    }, [initialGroups]);

    const onGroupSave = async (group: CompanyGroup) => {
        const newGroups = produce(groups, draft => {
            const index = draft.findIndex(g => g.id === group.id);
            if (index !== -1) {
                draft[index] = group;
            } else {
                draft.push(group);
            }
        });
        
        const result = await saveGroups(newGroups);
        if(result.success) {
            setGroups(newGroups);
            onSettingsChanged(); // Notify parent of the change
        } else {
             toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };
    
    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">مجموعات الشركات</h2>
                    <p className="text-sm text-muted-foreground">تنظيم الشركات في مجموعات لتطبيق إعدادات مخصصة.</p>
                </div>
                <AddEditGroupDialog onSave={onGroupSave}>
                    <Button size="sm">
                        <PlusCircle className="me-2 h-4 w-4"/> إضافة مجموعة
                    </Button>
                </AddEditGroupDialog>
            </div>
            
            <div className="border rounded-lg">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>الاسم</TableHead>
                            <TableHead>النوع</TableHead>
                            <TableHead className="w-[50px]"> </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groups.map(g => (
                            <TableRow key={g.id}>
                                <TableCell className="font-semibold flex items-center gap-2">
                                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }}/>
                                     {g.name}
                                </TableCell>
                                <TableCell><Badge variant="outline">{g.type}</Badge></TableCell>
                                <TableCell>
                                    <AddEditGroupDialog onSave={onGroupSave} isEditing group={g}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4"/></Button>
                                    </AddEditGroupDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </div>
        </div>
    );
}
