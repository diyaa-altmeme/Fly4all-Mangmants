

"use client";

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft, Loader2 } from 'lucide-react';
import ReconciliationHistoryContent from '@/components/reconciliation/history/reconciliation-history-content';
import { getReconciliationLogs } from '../actions';
import type { ReconciliationLog } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ReconciliationHistoryPage() {
  const [logs, setLogs] = useState<ReconciliationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getReconciliationLogs();
            setLogs(data);
        } catch (err: any) {
            setError("فشل في تحميل سجل التدقيق. يرجى المحاولة مرة أخرى.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);
  
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Button asChild variant="outline" size="icon">
                <Link href="/reconciliation">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">سجل التدقيق</h1>
                <p className="text-muted-foreground">عرض لجميع عمليات التدقيق الذكي التي تم إجراؤها في النظام.</p>
            </div>
        </div>
        <Card>
            <CardContent className="pt-6">
                {loading ? (
                    <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : error ? (
                     <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>حدث خطأ!</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : (
                    <ReconciliationHistoryContent logs={logs} />
                )}
            </CardContent>
        </Card>
    </div>
  );
}


