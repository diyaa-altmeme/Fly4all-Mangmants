
"use client"

import { ColumnDef } from "@tanstack/react-table";
import type { AuditLog, AuditLogAction, AuditLogTargetType } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ArrowUpDown, User, Type, FileText, Info, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect } from 'react';
import Link from "next/link";

const actionTypeConfig: Record<AuditLogAction, { label: string; className: string }> = {
    CREATE: { label: 'إضافة', className: 'bg-green-100 text-green-800' },
    UPDATE: { label: 'تعديل', className: 'bg-blue-100 text-blue-800' },
    DELETE: { label: 'حذف', className: 'bg-red-100 text-red-800' },
    LOGIN: { label: 'تسجيل دخول', className: 'bg-sky-100 text-sky-800' },
    LOGOUT: { label: 'تسجيل خروج', className: 'bg-gray-100 text-gray-800' },
    APPROVE: { label: 'موافقة', className: 'bg-teal-100 text-teal-800' },
    REJECT: { label: 'رفض', className: 'bg-orange-100 text-orange-800' },
    BLOCK: { label: 'حظر', className: 'bg-rose-100 text-rose-800' },
    UNBLOCK: { label: 'رفع الحظر', className: 'bg-indigo-100 text-indigo-800' },
};

const targetTypeConfig: Record<string, { label: string; icon: React.ElementType, path?: string }> = {
    CLIENT: { label: 'عميل', icon: User, path: '/clients' },
    SUPPLIER: { label: 'مورد', icon: User, path: '/suppliers' },
    USER: { label: 'مستخدم', icon: User, path: '/users' },
    BOOKING: { label: 'حجز', icon: FileText, path: '/bookings' },
    VOUCHER: { label: 'سند', icon: FileText, path: '/accounts/vouchers' },
    SUBSCRIPTION: { label: 'اشتراك', icon: FileText, path: '/subscriptions' },
    SETTINGS: { label: 'إعدادات', icon: FileText, path: '/settings' },
    RECONCILIATION: { label: 'تدقيق', icon: FileText, path: '/reconciliation/history' },
    MASTERCARD: { label: 'ماستركارد', icon: FileText, path: '/mastercard' },
    MASTERCARD_TRANSACTION: { label: 'حركة ماستركارد', icon: FileText, path: '/mastercard' },
    SEGMENT: { label: 'سكمنت', icon: FileText, path: '/segments' },
};

const ClientFormattedDate = ({ dateString }: { dateString: string }) => {
    // Safely format the date string. It's now safe to do directly.
    const formattedDate = format(parseISO(dateString), 'yyyy-MM-dd HH:mm:ss');
    return <div className="font-mono text-xs">{formattedDate}</div>;
};

export const getColumns = (): ColumnDef<AuditLog>[] => [
    {
        accessorKey: "createdAt",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                التاريخ والوقت <ArrowUpDown className="ms-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <ClientFormattedDate dateString={row.original.createdAt} />
    },
    {
        accessorKey: "userName",
        header: "المستخدم",
    },
    {
        accessorKey: "action",
        header: "نوع العملية",
        cell: ({ row }) => {
            const config = actionTypeConfig[row.original.action];
            return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        }
    },
    {
        accessorKey: "targetType",
        header: "القسم",
        cell: ({ row }) => {
            const config = targetTypeConfig[row.original.targetType];
            if (!config) {
                return (
                     <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-muted-foreground"/>
                        <span>{row.original.targetType}</span>
                    </div>
                );
            }
            return (
                <div className="flex items-center gap-2">
                    <config.icon className="h-4 w-4 text-muted-foreground"/>
                    <span>{config.label}</span>
                </div>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        }
    },
    {
        accessorKey: "description",
        header: "الوصف",
        cell: ({ row }) => <p className="text-sm text-muted-foreground whitespace-pre-wrap">{row.original.description}</p>
    },
    {
        id: 'actions',
        header: () => <div className="text-center">الإجراءات</div>,
        cell: ({ row }) => {
            const log = row.original;
            const targetInfo = targetTypeConfig[log.targetType];
            
            if (!log.targetId || !targetInfo?.path) {
                return null;
            }
            
            let link = `${targetInfo.path}/${log.targetId}`;
            if (['VOUCHER'].includes(log.targetType)) {
                link = `/accounts/vouchers/${log.targetId}/edit`;
            }

            return (
                <div className="text-center">
                    <Button asChild variant="outline" size="sm">
                        <Link href={link}>
                            <Eye className="me-2 h-4 w-4"/>
                            عرض
                        </Link>
                    </Button>
                </div>
            )
        }
    }
];
