
"use client";

import React, { useState, useMemo } from 'react';
import type { AuditLog, AuditLogAction, AuditLogTargetType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Search, Filter, Calendar } from 'lucide-react';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { useDebounce } from '@/hooks/use-debounce';
import { DataTableFacetedFilter } from '@/components/ui/data-table-faceted-filter';


const actionOptions: { label: string; value: AuditLogAction }[] = [
    { label: 'إضافة', value: 'CREATE' },
    { label: 'تعديل', value: 'UPDATE' },
    { label: 'حذف', value: 'DELETE' },
    { label: 'تسجيل دخول', value: 'LOGIN' },
    { label: 'تسجيل خروج', value: 'LOGOUT' },
    { label: 'الموافقة على', value: 'APPROVE' },
    { label: 'رفض', value: 'REJECT' },
    { label: 'حظر', value: 'BLOCK' },
    { label: 'رفع الحظر', value: 'UNBLOCK' },
];

const targetTypeOptions: { label: string; value: AuditLogTargetType }[] = [
    { label: 'عميل', value: 'CLIENT' },
    { label: 'مورد', value: 'SUPPLIER' },
    { label: 'مستخدم', value: 'USER' },
    { label: 'حجز', value: 'BOOKING' },
    { label: 'سند', value: 'VOUCHER' },
    { label: 'اشتراك', value: 'SUBSCRIPTION' },
    { label: 'إعدادات', value: 'SETTINGS' },
    // Add other types as they become available
];


interface AuditLogContentProps {
  initialLogs: AuditLog[];
}

export default function AuditLogContent({ initialLogs }: AuditLogContentProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const columns = useMemo(() => getColumns(), []);

    return (
        <DataTable
            columns={columns}
            data={initialLogs}
            searchTerm={debouncedSearchTerm}
            toolbarContent={
                 <>
                    <Input
                        placeholder="بحث بالوصف, المستخدم..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 w-[150px] lg:w-[250px]"
                    />
                    <DataTableFacetedFilter
                        columnTitle="نوع العملية"
                        title="العملية"
                        options={actionOptions}
                    />
                    <DataTableFacetedFilter
                        columnTitle="القسم"
                        title="القسم"
                        options={targetTypeOptions}
                    />
                </>
            }
        />
    );
}
