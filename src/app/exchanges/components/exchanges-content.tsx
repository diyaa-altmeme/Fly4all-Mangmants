
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, PlusCircle } from 'lucide-react';
import type { Exchange } from '@/lib/types';
import ExchangesTable from './exchanges-table';
import AddExchangeDialog from './add-exchange-dialog';
import ExchangeCard from './exchange-card';

interface ExchangesContentProps {
    initialExchanges: Exchange[];
}

export default function ExchangesContent({ initialExchanges }: ExchangesContentProps) {
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>إدارة البورصات</CardTitle>
                        <CardDescription>عرض وإدارة جميع حسابات البورصات في النظام.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('table')}>
                            <List className="h-4 w-4" />
                        </Button>
                        <Button variant={viewMode === 'cards' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('cards')}>
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <AddExchangeDialog onSuccess={() => {}}>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                إضافة بورصة جديدة
                            </Button>
                        </AddExchangeDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {viewMode === 'table' ? (
                    <ExchangesTable initialExchanges={initialExchanges} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {initialExchanges.map(exchange => (
                            <ExchangeCard key={exchange.id} exchange={exchange} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
