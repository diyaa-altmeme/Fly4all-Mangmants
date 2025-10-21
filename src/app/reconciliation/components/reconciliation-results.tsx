"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import type { ReconciliationResult, ReconciliationSettings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, FileQuestion, BadgePercent } from 'lucide-react';

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
};

const SummaryCard = ({ title, value, icon, colorClass }: { title: string; value: string | number; icon: React.ElementType; colorClass: string }) => {
    const Icon = icon;
    return (
        <Card className={cn("border-l-4", colorClass)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
};

export default function ReconciliationResults({ result, settings }: { result: ReconciliationResult, settings: ReconciliationSettings }) {
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>نتائج التدقيق والمطابقة</CardTitle>
                <CardDescription>
                    تمت مقارنة {result.summary.totalCompanyRecords} سجلًا من النظام مع {result.summary.totalSupplierRecords} سجلًا من المورد.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <SummaryCard title="مطابق تمامًا" value={result.summary.matched} icon={CheckCircle2} colorClass="border-green-500" />
                    <SummaryCard title="مطابق جزئيًا" value={result.summary.partialMatch} icon={AlertTriangle} colorClass="border-yellow-500" />
                    <SummaryCard title="مفقود في النظام" value={result.summary.missingInCompany} icon={FileQuestion} colorClass="border-red-500" />
                    <SummaryCard title="مفقود لدى المورد" value={result.summary.missingInSupplier} icon={FileQuestion} colorClass="border-orange-500" />
                    <SummaryCard title="إجمالي فرق السعر" value={formatCurrency(result.summary.totalPriceDifference, 'USD')} icon={BadgePercent} colorClass="border-blue-500" />
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>الحالة</TableHead>
                                {settings.matchingFields.filter(f => f.enabled).map(field => (
                                    <TableHead key={field.id}>{field.label}</TableHead>
                                ))}
                                <TableHead>ملاحظات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.records.map((record, index) => {
                                const statusConfig = {
                                    'MATCHED': { label: 'مطابق', color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' },
                                    'PARTIAL_MATCH': { label: 'جزئي', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200' },
                                    'MISSING_IN_COMPANY': { label: 'مفقود بالنظام', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' },
                                    'MISSING_IN_SUPPLIER': { label: 'مفقود بالمورد', color: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200' },
                                };
                                const config = statusConfig[record.status] || { label: record.status, color: 'bg-gray-200' };
                                return (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Badge className={config.color}>{config.label}</Badge>
                                        </TableCell>
                                        {settings.matchingFields.filter(f => f.enabled).map(field => (
                                            <TableCell key={field.id} className="font-mono text-xs">
                                                {record[field.id] !== undefined ? String(record[field.id]) : '-'}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-xs">
                                            {record.details?.map((detail, i) => (
                                                <div key={i}>{detail}</div>
                                            ))}
                                            {record.priceDifference ? <div className="font-bold">فرق السعر: {formatCurrency(record.priceDifference, 'USD')}</div> : null}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
