
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, PlusCircle, Loader2, Terminal } from 'lucide-react';
import type { Box } from '@/lib/types';
import BoxesTable from './components/boxes-table';
import AddEditBoxDialog from './components/add-edit-box-dialog';
import BoxCard from './components/box-card';
import { getBoxes } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function BoxesContent() {
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getBoxes();
            setBoxes(data);
        } catch (e: any) {
            setError(e.message || "Failed to load boxes.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }
    
    if (error) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between">
                <div className="flex-grow">
                    <CardTitle>إدارة الصناديق</CardTitle>
                    <CardDescription>عرض وإدارة جميع الصناديق المالية في النظام.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('table')}>
                        <List className="h-4 w-4" />
                    </Button>
                    <Button variant={viewMode === 'cards' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('cards')}>
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <AddEditBoxDialog onSaveSuccess={fetchData}>
                        <Button className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            إضافة صندوق جديد
                        </Button>
                    </AddEditBoxDialog>
                </div>
            </CardHeader>
            <CardContent>
                {viewMode === 'table' ? (
                    <BoxesTable initialBoxes={boxes} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {boxes.map(box => (
                            <BoxCard key={box.id} box={box} />
                        ))}
                         {boxes.length === 0 && <p className="col-span-full text-center p-8">لا توجد صناديق.</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function BoxesPage() {
    return (
        <div className="space-y-6">
            <BoxesContent />
        </div>
    );
}
