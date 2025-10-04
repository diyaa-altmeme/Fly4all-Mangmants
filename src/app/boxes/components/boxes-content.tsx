
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, PlusCircle } from 'lucide-react';
import type { Box } from '@/lib/types';
import BoxesTable from './boxes-table';
import AddEditBoxDialog from './add-edit-box-dialog';
import BoxCard from './box-card';

interface BoxesContentProps {
    initialBoxes: Box[];
}

export default function BoxesContent({ initialBoxes }: BoxesContentProps) {
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>إدارة الصناديق</CardTitle>
                        <CardDescription>عرض وإدارة جميع الصناديق المالية في النظام.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('table')}>
                            <List className="h-4 w-4" />
                        </Button>
                        <Button variant={viewMode === 'cards' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('cards')}>
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <AddEditBoxDialog>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                إضافة صندوق جديد
                            </Button>
                        </AddEditBoxDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {viewMode === 'table' ? (
                    <BoxesTable initialBoxes={initialBoxes} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {initialBoxes.map(box => (
                            <BoxCard key={box.id} box={box} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
