
"use client";

import { ColumnDef } from "@tanstack/react-table"
import type { AuditLog, AuditLogAction, AuditLogTargetType } from "@/lib/types";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, User, Edit, Plus, Trash2, ShieldCheck, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const actionConfig: Record<AuditLogAction, { label: string; icon: React.ElementType; color: string }> = {
    CREATE: { label: 'إضافة', icon: Plus, color: 'bg-green-500' },
    UPDATE: { label: 'تعديل', icon: Edit, color: 'bg-blue-500' },
    DELETE: { label: 'حذف', icon: Trash2, color: 'bg-red-500' },
    LOGIN: { label: 'دخول', icon: LogIn, color: 'bg-cyan-500' },
    LOGOUT: { label: 'خروج', icon: LogOut, color: 'bg-gray-500' },
    APPROVE: { label: 'موافقة', icon: ShieldCheck, color: 'bg-teal-500' },
    REJECT: { label: 'رفض', icon: ShieldCheck, color: 'bg-orange-500' },
    BLOCK: { label: 'حظر', icon: ShieldCheck, color: 'bg-zinc-500' },
    UNBLOCK: { label: 'رفع الحظر', icon: ShieldCheck, color: 'bg-lime-500' },
};

const targetTypeTranslations: Record<AuditLogTargetType, string> = {
    CLIENT: 'عميل',
    SUPPLIER: 'مورد',
    USER: 'مستخدم',
    BOOKING: 'حجز',
    VOUCHER: 'سند',
    SUBSCRIPTION: 'اشتراك',
    SETTINGS: 'إعدادات',
    RECONCILIATION: 'مطابقة',
    MASTERCARD: 'ماستر كارد',
    MASTERCARD_TRANSACTION: 'حركة ماستر كارد',
    SEGMENT: 'سكمنت',
};


export const getColumns = (): ColumnDef<AuditLog>[] => [
    {
        accessorKey: 'createdAt',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                التاريخ والوقت <ArrowUpDown className="ms-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const date = new Date(row.original.createdAt);
            return <div className="font-mono">{format(date, 'yyyy/MM/dd, hh:mm a')}</div>
        }
    },
    {
        accessorKey: 'userName',
        header: 'المستخدم',
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{row.original.userName}</span>
            </div>
        )
    },
    {
        accessorKey: 'action',
        header: 'نوع العملية',
        cell: ({ row }) => {
            const config = actionConfig[row.original.action];
            if (!config) return <Badge>{row.original.action}</Badge>
            const Icon = config.icon;
            return <Badge className={config.color}><Icon className="me-1 h-3 w-3"/>{config.label}</Badge>
        }
    },
    {
        accessorKey: 'targetType',
        header: 'القسم',
         cell: ({ row }) => {
            const label = targetTypeTranslations[row.original.targetType] || row.original.targetType;
            return <Badge variant="secondary">{label}</Badge>
        }
    },
    {
        accessorKey: 'description',
        header: 'الوصف',
    },
];

