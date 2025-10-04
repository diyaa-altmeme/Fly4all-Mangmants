
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Wand2, Download, FileSpreadsheet } from "lucide-react";
import FileUploader from '@/components/reconciliation/file-uploader';
import ReconciliationSettingsContent from '@/components/reconciliation/settings/reconciliation-settings-content';
import ResultsDisplay from '@/components/reconciliation/results-display';
import { useToast } from '@/hooks/use-toast';
import { performReconciliation, type ReconciliationResult, type ReconciliationSettings, defaultSettings } from '@/lib/reconciliation';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { addReconciliationLog } from '@/app/reconciliation/actions';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import * as XLSX from 'xlsx';

const ReconciliationTool = () => {
    const [companyRecords, setCompanyRecords] = React.useState<any[]>([]);
    const [supplierRecords, setSupplierRecords] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [results, setResults] = React.useState<ReconciliationResult | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const { toast } = useToast();
    const [settings, setSettings] = React.useState<ReconciliationSettings>(defaultSettings);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [currency, setCurrency] = React.useState<Currency>('USD');

    const loadSettings = React.useCallback(() => {
        try {
            const savedSettings = localStorage.getItem('reconciliationSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setSettings({ ...defaultSettings, ...parsed });
            } else {
                 setSettings(defaultSettings);
            }
        } catch (e) {
            console.error("Could not parse reconciliation settings", e);
            setSettings(defaultSettings);
        }
    }, []);

    React.useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleCompanyFile = React.useCallback((data: any[]) => {
        setCompanyRecords(data);
        toast({ title: "تم تحميل ملف الشركة بنجاح", description: `تم العثور على ${data.length} سجل.` });
    }, [toast]);

    const handleSupplierFile = React.useCallback((data: any[]) => {
        setSupplierRecords(data);
        toast({ title: "تم تحميل ملف المورد بنجاح", description: `تم العثور على ${data.length} سجل.` });
    }, [toast]);

    const handleReconciliation = async () => {
        setError(null);
        if (companyRecords.length === 0 || supplierRecords.length === 0) {
            toast({
                title: "ملفات غير مكتملة",
                description: "الرجاء رفع ملف كشف الشركة وملف كشف المورد أولاً.",
                variant: "destructive",
            });
            return;
        }
         if (!settings) {
            toast({ title: "الإعدادات غير محملة", description: "لا يمكن بدء التدقيق بدون إعدادات.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        setProgress(0);
        
        const interval = setInterval(() => {
            setProgress(prev => (prev < 90 ? prev + 10 : 90));
        }, 150);

        setTimeout(async () => {
            try {
                const reconciliationResults = performReconciliation(companyRecords, supplierRecords, settings, currency, []);
                setResults(reconciliationResults);
                 setProgress(100);
                 clearInterval(interval);
                toast({
                    title: "اكتمل التدقيق الذكي",
                    description: `تمت معالجة ${reconciliationResults.summary.totalRecords} سجل.`,
                });
                
                const user = await getCurrentUserFromSession();
                await addReconciliationLog({
                    runAt: new Date().toISOString(),
                    userId: user?.uid || 'unknown',
                    userName: user?.name || 'Unknown User',
                    settings,
                    filters: [],
                    currency,
                    summary: reconciliationResults.summary
                });

            } catch (err: any) {
                setError(err.message || "حدث خطأ غير متوقع أثناء عملية المطابقة.");
                 clearInterval(interval);
            } finally {
                setTimeout(() => {
                    setIsLoading(false);
                }, 500);
            }
        }, 1500);
    };

    const handleSettingsSaved = () => {
        loadSettings();
        setIsSettingsOpen(false);
    };

    const handleExport = () => {
        if (!results) {
            toast({ title: "لا توجد نتائج للتصدير", variant: "destructive" });
            return;
        }

        const workbook = XLSX.utils.book_new();

        // 1. Summary Sheet
        const summaryData = [
            ["الفئة", "العدد"],
            ["إجمالي سجلات الشركة", results.summary.totalCompanyRecords],
            ["إجمالي سجلات المورد", results.summary.totalSupplierRecords],
            ["متطابق", results.summary.matched],
            ["شبه متطابق", results.summary.partialMatch],
            ["مفقود لدى المورد", results.summary.missingInSupplier],
            ["مفقود في نظامك", results.summary.missingInCompany],
            ["فرق السعر الإجمالي", results.summary.totalPriceDifference.toFixed(2)],
        ];
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summaryWs, "الملخص");

        // 2. Data Sheets
        const createSheet = (status: string, sheetName: string) => {
            const data = results.records.filter(r => r.status === status);
            if (data.length > 0) {
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(workbook, ws, sheetName);
            }
        }
        
        createSheet('MATCHED', 'متطابق');
        createSheet('PARTIAL_MATCH', 'شبه متطابق');
        createSheet('MISSING_IN_SUPPLIER', 'مفقود لدى المورد');
        createSheet('MISSING_IN_COMPANY', 'مفقود في نظامك');
        
        XLSX.writeFile(workbook, `Reconciliation_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        toast({ title: "تم تصدير النتائج بنجاح" });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Wand2 className="h-6 w-6"/>أداة التدقيق</CardTitle>
                        <CardDescription>ارفع الملفات، اختر العملة، ثم ابدأ عملية التدقيق الذكي.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                         <Button onClick={handleExport} variant="outline" disabled={!results}>
                            <FileSpreadsheet className="me-2 h-4 w-4"/>تصدير النتائج
                        </Button>
                         <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><Settings className="me-2 h-4 w-4"/>الإعدادات</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                               <DialogHeader>
                                    <DialogTitle>إعدادات التدقيق الذكي</DialogTitle>
                                    <DialogDescription>
                                        تخصيص الحقول وقواعد المطابقة لتناسب ملفاتك.
                                    </DialogDescription>
                               </DialogHeader>
                                <div className="flex-grow overflow-auto -mx-6 px-6">
                                    <ReconciliationSettingsContent initialSettings={settings} onSettingsSaved={handleSettingsSaved} />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileUploader
                        title="1. ملف الشركة"
                        description="ارفع ملف Excel"
                        onFileUpload={handleCompanyFile}
                        fileId="company-file"
                        borderColorClass="border-orange-500"
                    />
                    <FileUploader
                        title="2. ملف المورد"
                        description="ارفع ملف Excel"
                        onFileUpload={handleSupplierFile}
                        fileId="supplier-file"
                        borderColorClass="border-green-500"
                    />
                </div>
                 <div className="space-y-4 w-full max-w-sm mx-auto text-center">
                    <div className="space-y-1.5">
                        <Label htmlFor="currency" className="text-center block font-semibold">عملة الكشف</Label>
                        <Select onValueChange={(value) => setCurrency(value as Currency)} defaultValue={currency}>
                        <SelectTrigger id="currency" className="font-bold justify-center">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USD" className="font-bold justify-center">USD</SelectItem>
                            <SelectItem value="IQD" className="font-bold justify-center">IQD</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                    <div>
                        {isLoading ? (
                            <div className="relative h-10 w-full">
                                <Progress value={progress} className="h-full rounded-md" />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-white font-bold text-sm drop-shadow-md">جاري التدقيق...</span>
                                </div>
                            </div>
                        ) : (
                            <Button
                                size="lg"
                                onClick={handleReconciliation}
                                disabled={companyRecords.length === 0 || supplierRecords.length === 0 || !settings}
                                className="w-full h-10"
                            >
                                <Wand2 className="me-2 h-5 w-5" />
                                بدء التدقيق
                            </Button>
                        )}
                    </div>
                </div>
                {error && (
                    <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>حدث خطأ!</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {results && <ResultsDisplay results={results} settingsFields={settings.matchingFields} currency={currency} />}
            </CardContent>
        </Card>
    );
};

export default ReconciliationTool;
