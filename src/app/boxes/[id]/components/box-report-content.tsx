

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { AlertTriangle, CalendarIcon, FileText, BarChart, Download, Loader2, Search, Filter, ArrowDown, ArrowUp } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, subDays, parseISO } from "date-fns";
import type { Box, ReportInfo, ReportTransaction, Currency, Client, Supplier } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getAccountStatement } from '@/app/reports/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportGenerator from '@/app/reports/components/report-generator';


export default function BoxReportContent({ box, clients, suppliers }: { box: Box, clients: Client[], suppliers: Supplier[] }) {
    
    return (
       <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold tracking-tight">تقرير الصندوق: {box.name}</h1>
            </div>
            <Tabs defaultValue="summary">
                <TabsList>
                    <TabsTrigger value="summary">كشف الصندوق</TabsTrigger>
                    <TabsTrigger value="profits" disabled>تقرير الأرباح (قريبا)</TabsTrigger>
                    <TabsTrigger value="expenses" disabled>تقرير المصاريف (قريبا)</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="mt-4">
                     <ReportGenerator 
                        boxes={[box]} 
                        clients={clients} 
                        suppliers={suppliers} 
                        defaultAccountId={box.id}
                    />
                </TabsContent>
                <TabsContent value="profits">
                    <Card><CardContent className="p-8 text-center text-muted-foreground">سيتم عرض تقرير الأرباح هنا.</CardContent></Card>
                </TabsContent>
                <TabsContent value="expenses">
                    <Card><CardContent className="p-8 text-center text-muted-foreground">سيتم عرض تقرير المصاريف هنا.</CardContent></Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
