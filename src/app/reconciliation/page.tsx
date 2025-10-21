"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, FileUp, ListChecks } from 'lucide-react';
import type { ReconciliationResult, ReconciliationSettings, FilterRule, Client, Supplier } from '@/lib/types';
import FileUploader from '@/components/reconciliation/file-uploader';
import { performReconciliation, defaultSettings } from '@/lib/reconciliation';
import ReconciliationResults from '@/app/reconciliation/components/reconciliation-results';
import { useToast } from '@/hooks/use-toast';
import { addReconciliationLog } from './actions';
import { useAuth } from '@/lib/auth-context';

export default function ReconciliationPage() {
    const [companyData, setCompanyData] = useState<any[]>([]);
    const [supplierData, setSupplierData] = useState<any[]>([]);
    const [settings, setSettings] = useState<ReconciliationSettings>(defaultSettings);
    const [result, setResult] = useState<ReconciliationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    
    const handleReconciliation = async () => {
        if (companyData.length === 0 || supplierData.length === 0) {
            toast({ title: "الرجاء رفع الملفين للمتابعة", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            const reconciliationResult = performReconciliation(companyData, supplierData, settings, 'USD');
            setResult(reconciliationResult);
            toast({ title: 'اكتملت المطابقة بنجاح' });
            
            if(user) {
                 await addReconciliationLog({
                    runAt: new Date().toISOString(),
                    userId: user.uid,
                    userName: user.name,
                    settings: settings,
                    filters: [],
                    currency: 'USD',
                    summary: reconciliationResult.summary,
                 });
            }
        } catch (error: any) {
            toast({ title: "خطأ في المطابقة", description: error.message, variant: "destructive" });
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>التدقيق الذكي (مطابقة الكشوفات)</CardTitle>
                    <CardDescription>
                        قارن بين كشف حسابك وكشف حساب المورد لكشف الفروقات وتحديد المعاملات المفقودة تلقائيًا.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FileUploader
                            title="ملف النظام (كشف حسابك)"
                            description="ارفع ملف Excel الذي تم تصديره من نظامك."
                            onFileUpload={setCompanyData}
                            fileId="company-file"
                            borderColorClass="border-primary"
                        />
                         <FileUploader
                            title="ملف المورد (الكشف المقابل)"
                            description="ارفع ملف Excel الخاص بالمورد الذي تريد مطابقته."
                            onFileUpload={setSupplierData}
                            fileId="supplier-file"
                            borderColorClass="border-accent"
                        />
                    </div>
                     <div className="flex justify-center">
                        <Button onClick={handleReconciliation} disabled={isLoading || companyData.length === 0 || supplierData.length === 0} size="lg">
                            {isLoading ? <Loader2 className="me-2 h-5 w-5 animate-spin" /> : <ListChecks className="me-2 h-5 w-5" />}
                            بدء المطابقة والتدقيق
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && (
                 <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            )}
            
            {result && <ReconciliationResults result={result} settings={settings} />}
        </div>
    );
}
