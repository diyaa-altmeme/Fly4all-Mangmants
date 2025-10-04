
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Ticket, CreditCard, Repeat, Users, Loader2, Save } from 'lucide-react';
import { calculateAndSaveProfits, type MonthlyProfit } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';

const StatCard = ({ icon: Icon, title, value }: { icon: React.ElementType, title: string, value: string }) => (
    <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
        <Icon className="h-8 w-8 text-primary" />
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);

interface ProfitsDashboardProps {
    initialMonthId: string;
    savedProfits: MonthlyProfit[];
}

export default function ProfitsDashboard({ initialMonthId, savedProfits }: ProfitsDashboardProps) {
    const [selectedMonth, setSelectedMonth] = useState(initialMonthId);
    const [currentProfitData, setCurrentProfitData] = useState<MonthlyProfit | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        const profit = savedProfits.find(p => p.id === selectedMonth);
        setCurrentProfitData(profit || null);
    }, [selectedMonth, savedProfits]);

    const handleCalculateAndSave = async () => {
        setIsLoading(true);
        const result = await calculateAndSaveProfits(selectedMonth);
        if (result.success && result.data) {
            setCurrentProfitData(result.data);
            toast({ title: `تم حساب وحفظ أرباح شهر ${selectedMonth}` });
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
        setIsLoading(false);
    };

    const totalProfit = useMemo(() => {
        if (!currentProfitData) return 0;
        return currentProfitData.totalProfit;
    }, [currentProfitData]);

    const profitItems = useMemo(() => [
        { label: 'تذاكر الطيران', value: currentProfitData?.breakdown.tickets || 0, icon: Ticket },
        { label: 'الفيزا', value: currentProfitData?.breakdown.visa || 0, icon: CreditCard },
        { label: 'الاشتراكات', value: currentProfitData?.breakdown.subscriptions || 0, icon: Repeat },
        { label: 'القروبات', value: currentProfitData?.breakdown.groups || 0, icon: Users },
    ], [currentProfitData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <label className="font-bold">الشهر:</label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="اختر شهرًا..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={initialMonthId}>{initialMonthId}</SelectItem>
                            {savedProfits.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleCalculateAndSave} disabled={isLoading}>
                    {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                    حساب وحفظ أرباح الشهر المحدد
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {profitItems.map(item => (
                    <StatCard key={item.label} icon={item.icon} title={item.label} value={`${item.value.toLocaleString()} USD`} />
                ))}
            </div>
            
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">القسم</TableHead>
                        <TableHead className="text-right">الربح</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {profitItems.map((item) => (
                        <TableRow key={item.label}>
                            <TableCell className="font-medium flex items-center gap-2"><item.icon className="h-5 w-5 text-muted-foreground"/> {item.label}</TableCell>
                            <TableCell className="text-right font-mono">{item.value.toLocaleString()} USD</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-green-50 dark:bg-green-900/20">
                        <TableCell className="font-bold text-lg">الإجمالي</TableCell>
                        <TableCell className="text-right font-bold text-lg text-green-700 dark:text-green-300 font-mono">
                            {totalProfit.toLocaleString()} USD
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );
}
