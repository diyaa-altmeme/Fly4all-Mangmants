
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, Loader2, Database, Server, Link2, KeyRound, Power, PowerOff } from 'lucide-react';
import { checkSystemHealth, updateSettings, getSettings } from '@/app/settings/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HealthCheckResult, DatabaseStatusSettings, AppSettings } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const StatusCard = ({ title, description, status, onTest, isTesting }: {
  title: string;
  description: string;
  status: HealthCheckResult | null;
  onTest: () => void;
  isTesting: boolean;
}) => {
    if (isTesting) {
        return (
            <Card className="flex-1">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>جاري فحص الاتصال...</span>
                    </div>
                </CardContent>
                 <CardFooter>
                     <Button onClick={onTest} disabled={true} variant="outline" size="sm">
                        إعادة الفحص
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    if (!status) {
        return (
            <Card className="flex-1">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span>جاهز للفحص...</span>
                    </div>
                </CardContent>
                 <CardFooter>
                     <Button onClick={onTest} variant="outline" size="sm">
                        بدء الفحص
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    const Icon = status.success ? CheckCircle2 : AlertCircle;
    const color = status.success ? 'text-green-500' : 'text-red-500';

    return (
        <Card className="flex-1">
            <CardHeader className="pb-4">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={cn("flex items-center gap-2 font-semibold", color)}>
                    <Icon className="h-5 w-5" />
                    <span>{status.message}</span>
                </div>
                 <p className="text-xs text-muted-foreground mt-2">{description}</p>
            </CardContent>
            <CardFooter>
                 <Button onClick={onTest} disabled={isTesting} variant="outline" size="sm">
                    {isTesting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                    إعادة الفحص
                </Button>
            </CardFooter>
        </Card>
    )
}

interface SystemStatusSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function SystemStatusSettings({ settings, onSettingsChanged }: SystemStatusSettingsProps) {
    const [healthStatus, setHealthStatus] = useState<HealthCheckResult[]>([]);
    const [isLoadingHealth, setIsLoadingHealth] = useState(true);
    const [dbStatus, setDbStatus] = useState<DatabaseStatusSettings | null>(settings.databaseStatus || { isDatabaseConnected: true });
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();


    const fetchStatus = useCallback(async () => {
        setIsLoadingHealth(true);
        const healthResults = await checkSystemHealth();
        setHealthStatus(healthResults);
        setIsLoadingHealth(false);
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);
    
     const handleDbStatusChange = async (checked: boolean) => {
        setIsSaving(true);
        const newStatus = { isDatabaseConnected: checked };
        const result = await updateSettings({ databaseStatus: newStatus });
        if (result.success) {
            setDbStatus(newStatus);
            toast({ title: `تم ${checked ? 'إعادة وصل' : 'قطع'} الاتصال بنجاح` });
            onSettingsChanged();
        } else {
            toast({ title: "خطأ", description: "لم يتم تغيير حالة الاتصال.", variant: "destructive" });
        }
        setIsSaving(false);
    };

    const firebaseStatus = healthStatus.find(s => s.service === 'Firebase') || null;
    const driveStatus = healthStatus.find(s => s.service === 'Google Drive') || null;
    
    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-muted-foreground"/> حالة اتصال قاعدة البيانات
                    </CardTitle>
                    <CardDescription>
                       استخدم هذا المفتاح لقطع أو إعادة وصل الاتصال بقاعدة البيانات في كامل التطبيق. مفيد لحل مشاكل الحصة (Quota) أو التوقف المؤقت.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {dbStatus === null || isLoadingHealth ? (
                         <Skeleton className="h-10 w-48" />
                    ) : (
                        <div className="flex items-center gap-4 rounded-lg border p-4">
                            <div className={cn("flex items-center gap-2 font-semibold", dbStatus.isDatabaseConnected ? 'text-green-500' : 'text-red-500')}>
                                {dbStatus.isDatabaseConnected ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
                                <span>حالة الاتصال: {dbStatus.isDatabaseConnected ? 'متصل' : 'غير متصل'}</span>
                            </div>
                            <div className="flex-grow" />
                            <div className="flex items-center gap-2">
                                <Label htmlFor="db-connection-switch">
                                    {dbStatus.isDatabaseConnected ? 'قطع الاتصال' : 'إعادة الاتصال'}
                                </Label>
                                <Switch
                                    id="db-connection-switch"
                                    checked={dbStatus.isDatabaseConnected}
                                    onCheckedChange={handleDbStatusChange}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
             <div className="flex flex-col md:flex-row gap-6">
                <StatusCard 
                    title="Firebase (قاعدة البيانات)"
                    description="يتحقق من قدرة الخادم على الاتصال بقاعدة بيانات Firestore باستخدام بيانات الاعتماد المخزنة."
                    status={firebaseStatus}
                    onTest={fetchStatus}
                    isTesting={isLoadingHealth}
                />
                <StatusCard 
                    title="Google Drive (أرشيف الملفات)"
                    description="يتحقق من قدرة الخادم على الاتصال بـ Google Drive لرفع الملفات."
                    status={driveStatus}
                    onTest={fetchStatus}
                    isTesting={isLoadingHealth}
                />
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-muted-foreground"/> بيانات الاعتماد (Credentials)</CardTitle>
                    <CardDescription>
                       يعتمد هذا النظام على بيانات اعتماد (ملف خدمة) يتم تخزينها بشكل آمن على الخادم كمتغيرات بيئة (Environment Variables) ولا يمكن عرضها أو تعديلها من هنا للحفاظ على الأمان. للربط، يجب تزويد المطورين بملف الخدمة الصحيح من Google Cloud Console.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}
