
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from './files-archive-table';
import { columns } from './files-archive-columns';
import type { ReconciliationFile } from '@/lib/types';
import UploadArchiveFileDialog from './upload-archive-file-dialog';
import { getArchivedFiles } from '@/app/reconciliation/files/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { PlusCircle } from 'lucide-react';
import { Button } from '../ui/button';

export default function FilesArchive() {
    const [files, setFiles] = useState<ReconciliationFile[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const tableColumns = useMemo(() => columns, []);

    const refreshFiles = async () => {
        setLoading(true);
        try {
            const data = await getArchivedFiles();
            setFiles(data);
        } catch (error) {
            toast({
                title: "خطأ في تحميل الأرشيف",
                description: "فشل تحميل قائمة الملفات المؤرشفة.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refreshFiles();
    }, []);

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>أرشيف ملفات التدقيق</CardTitle>
                    <CardDescription>
                        عرض وإدارة جميع ملفات Excel المرفوعة والمستخدمة في عمليات التدقيق.
                    </CardDescription>
                </div>
                <UploadArchiveFileDialog onUploadSuccess={refreshFiles}>
                    <Button>
                        <PlusCircle className="me-2 h-4 w-4" />
                        رفع ملف جديد للأرشيف
                    </Button>
                </UploadArchiveFileDialog>
            </CardHeader>
            <CardContent>
                 {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <DataTable columns={tableColumns} data={files} />
                )}
            </CardContent>
        </Card>
    );
}
