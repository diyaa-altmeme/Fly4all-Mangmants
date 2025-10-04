

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ReconciliationFile } from "@/lib/types";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Download, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { deleteArchivedFile } from "@/app/reconciliation/files/actions";
import { useToast } from "@/hooks/use-toast";

const ActionsCell = ({ file }: { file: ReconciliationFile }) => {
    const { toast } = useToast();

    const handleDelete = async () => {
        const result = await deleteArchivedFile(file);
        if (result.success) {
            toast({ title: "تم حذف الملف بنجاح" });
            // Revalidation will refresh the list
        } else {
            toast({ title: "خطأ", description: result.error, variant: "destructive" });
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem asChild>
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <Download className="me-2 h-4 w-4" />
                        تحميل / عرض
                    </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="me-2 h-4 w-4" />
                    حذف
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export const columns: ColumnDef<ReconciliationFile>[] = [
    {
        accessorKey: "name",
        header: () => <div className="text-center font-bold">اسم الملف / الوصف</div>,
        cell: ({ row }) => <div className="text-center">{row.original.name}</div>
    },
    {
        accessorKey: "originalFileName",
        header: () => <div className="text-center font-bold">اسم الملف الأصلي</div>,
        cell: ({ row }) => <div className="text-center">{row.original.originalFileName}</div>
    },
    {
        accessorKey: "uploadedAt",
        header: () => <div className="text-center font-bold">تاريخ الرفع</div>,
        cell: ({ row }) => <div className="text-center">{format(new Date(row.original.uploadedAt), 'yyyy-MM-dd HH:mm')}</div>
    },
    {
        accessorKey: "uploadedBy",
        header: () => <div className="text-center font-bold">المستخدم</div>,
        cell: ({ row }) => <div className="text-center">{row.original.uploadedBy}</div>
    },
    {
        id: 'actions',
        header: () => <div className="text-center font-bold">الإجراءات</div>,
        cell: ({ row }) => <div className="text-center"><ActionsCell file={row.original} /></div>
    }
];

