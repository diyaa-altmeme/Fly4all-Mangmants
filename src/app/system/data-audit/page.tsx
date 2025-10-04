

"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Search, SlidersHorizontal, AlertTriangle, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runDataAudit, type DataAuditIssue } from './actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const IssueDetailsDialog = ({ issue }: { issue: DataAuditIssue }) => {
    const typeConfig = {
        DUPLICATE_PNR: { label: "تكرار PNR" },
        NEGATIVE_PROFIT: { label: "ربح سالب" },
        ZERO_PRICE: { label: "سعر صفري" },
        COMMISSION_ERROR: { label: "خطأ في العمولة" },
        INVOICE_ERROR: { label: "خطأ في الفاتورة" },
        SAVE_ERROR: { label: "خطأ في الحفظ" },
        COST_MISMATCH: { label: "عدم تطابق الكلفة" },
        UNMATCHED_RETURN: { label: "رحلة ذهاب وعودة" },
    };
    const config = typeConfig[issue.type];

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>تفاصيل المشكلة: {config.label}</DialogTitle>
                <DialogDescription>{issue.description}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                {issue.type === 'DUPLICATE_PNR' && issue.details && Array.isArray(issue.details) && (
                    <div>
                        <h4 className="font-bold mb-2">الحجوزات المكررة لـ PNR: {issue.pnr}</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>رقم الفاتورة</TableHead>
                                    <TableHead>الإجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {issue.details.map((detail: any) => (
                                    <TableRow key={detail.id}>
                                        <TableCell>{detail.invoice || detail.id}</TableCell>
                                        <TableCell>
                                            <Button asChild variant="secondary" size="sm">
                                                <Link href={`/bookings?search=${issue.pnr}&searchField=pnr`} target="_blank">
                                                    الذهاب للحجز <ExternalLink className="h-3 w-3 ms-2"/>
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </DialogContent>
    )
}

const IssueCard = ({ issue }: { issue: DataAuditIssue }) => {
    const typeConfig = {
        DUPLICATE_PNR: { label: "تكرار PNR", color: "bg-orange-500" },
        NEGATIVE_PROFIT: { label: "ربح سالب", color: "bg-red-500" },
        ZERO_PRICE: { label: "سعر صفري", color: "bg-yellow-500 text-black" },
        COMMISSION_ERROR: { label: "خطأ عمولة", color: "bg-purple-500" },
        INVOICE_ERROR: { label: "خطأ فاتورة", color: "bg-blue-500" },
        SAVE_ERROR: { label: "خطأ حفظ", color: "bg-gray-500" },
        COST_MISMATCH: { label: "عدم تطابق الكلفة", color: "bg-indigo-500" },
        UNMATCHED_RETURN: { label: "رحلة ذهاب وعودة", color: "bg-cyan-500" },
    };

    const config = typeConfig[issue.type];

    return (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <div>
                <div className="flex items-center gap-2">
                     <Badge className={cn("text-white", config.color)}>{config.label}</Badge>
                    <p className="font-semibold">{issue.pnr || 'N/A'}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
            </div>
             <Dialog>
                <DialogTrigger asChild>
                   <Button variant="outline" size="sm">عرض</Button>
                </DialogTrigger>
                <IssueDetailsDialog issue={issue} />
            </Dialog>
        </div>
    )
}

const ResultsDisplay = ({ issues }: { issues: DataAuditIssue[] }) => {
    const groupedIssues = issues.reduce((acc, issue) => {
        if (!acc[issue.type]) {
            acc[issue.type] = [];
        }
        acc[issue.type].push(issue);
        return acc;
    }, {} as Record<DataAuditIssue['type'], DataAuditIssue[]>);
    
    if (issues.length === 0) {
        return (
            <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">لم يتم العثور على أي مشاكل أو أخطاء.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {Object.entries(groupedIssues).map(([type, issuesList]) => (
                 <Card key={type}>
                    <CardHeader><CardTitle>{type} ({issuesList.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-2">{issuesList.map(issue => <IssueCard key={issue.id} issue={issue} />)}</CardContent>
                </Card>
            ))}
        </div>
    )
}

export default function DataAuditPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<DataAuditIssue[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [auditOptions, setAuditOptions] = useState({
        checkDuplicatePnr: true,
        checkNegativeProfit: true,
        checkZeroPrices: true,
        checkCommissionErrors: true,
        checkInvoiceErrors: true,
        checkCostMismatch: true,
        checkReturnTrip: true,
    });
    const { toast } = useToast();
    
    const handleRunAudit = async () => {
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const data = await runDataAudit(auditOptions);
            setResults(data);
            toast({ title: 'اكتمل الفحص', description: `تم العثور على ${data.length} مشكلة.` });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleOptionChange = (key: keyof typeof auditOptions, value: boolean) => {
        setAuditOptions(prev => ({ ...prev, [key]: value }));
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>فحص بيانات النظام</CardTitle>
                    <CardDescription>أداة للبحث عن الأخطاء المحتملة والمشاكل المنطقية في البيانات المدخلة مثل تكرار الحجوزات أو الأرباح السالبة.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2"><SlidersHorizontal className="h-4 w-4"/> إعدادات الفحص</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="flex items-center space-x-2 space-x-reverse rounded-lg border p-4">
                                <Checkbox id="check-pnr" checked={auditOptions.checkDuplicatePnr} onCheckedChange={(c) => handleOptionChange('checkDuplicatePnr', !!c)} />
                                <Label htmlFor="check-pnr" className="font-semibold">فحص تكرار أرقام الحجز (PNR)</Label>
                            </div>
                             <div className="flex items-center space-x-2 space-x-reverse rounded-lg border p-4">
                                <Checkbox id="check-return" checked={auditOptions.checkReturnTrip} onCheckedChange={(c) => handleOptionChange('checkReturnTrip', !!c)} />
                                <Label htmlFor="check-return" className="font-semibold">فحص رحلات الذهاب والعودة غير المرتبطة</Label>
                            </div>
                             <div className="flex items-center space-x-2 space-x-reverse rounded-lg border p-4">
                                <Checkbox id="check-profit" checked={auditOptions.checkNegativeProfit} onCheckedChange={(c) => handleOptionChange('checkNegativeProfit', !!c)} />
                                <Label htmlFor="check-profit" className="font-semibold">فحص التذاكر ذات الربح السالب</Label>
                            </div>
                             <div className="flex items-center space-x-2 space-x-reverse rounded-lg border p-4">
                                <Checkbox id="check-zero" checked={auditOptions.checkZeroPrices} onCheckedChange={(c) => handleOptionChange('checkZeroPrices', !!c)} />
                                <Label htmlFor="check-zero" className="font-semibold">فحص التذاكر بأسعار صفرية</Label>
                            </div>
                              <div className="flex items-center space-x-2 space-x-reverse rounded-lg border p-4">
                                <Checkbox id="check-commission" checked={auditOptions.checkCommissionErrors} onCheckedChange={(c) => handleOptionChange('checkCommissionErrors', !!c)} />
                                <Label htmlFor="check-commission" className="font-semibold">فحص أخطاء حساب العمولة</Label>
                            </div>
                              <div className="flex items-center space-x-2 space-x-reverse rounded-lg border p-4">
                                <Checkbox id="check-invoice" checked={auditOptions.checkInvoiceErrors} onCheckedChange={(c) => handleOptionChange('checkInvoiceErrors', !!c)} />
                                <Label htmlFor="check-invoice" className="font-semibold">فحص أخطاء أرقام الفواتير</Label>
                            </div>
                              <div className="flex items-center space-x-2 space-x-reverse rounded-lg border p-4">
                                <Checkbox id="check-cost" checked={auditOptions.checkCostMismatch} onCheckedChange={(c) => handleOptionChange('checkCostMismatch', !!c)} />
                                <Label htmlFor="check-cost" className="font-semibold">فحص عدم تطابق الكلفة</Label>
                            </div>
                        </CardContent>
                    </Card>
                     <Button onClick={handleRunAudit} disabled={isLoading} size="lg" className="w-full">
                        {isLoading ? <><Loader2 className="me-2 h-4 w-4 animate-spin"/> جاري الفحص...</> : <><Search className="me-2 h-4 w-4"/> بدء الفحص الشامل</>}
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>حدث خطأ!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {results && <ResultsDisplay issues={results} />}

        </div>
    );
}
