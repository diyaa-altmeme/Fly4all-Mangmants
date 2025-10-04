

"use client";

import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Remittance } from '@/lib/types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, ShieldCheck, CheckCircle, CircleDotDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import AuditRemittanceDialog from './audit-remittance-dialog';
import ConfirmReceiptDialog from './confirm-receipt-dialog';
import { useVoucherNav } from '@/context/voucher-nav-context';

const statusConfig: Record<Remittance['status'], { label: string; icon: React.ElementType; className: string }> = {
    pending_audit: { label: "بانتظار التدقيق", icon: CircleDotDashed, className: "bg-yellow-100 text-yellow-800" },
    pending_reception: { label: "بانتظار الاستلام", icon: ShieldCheck, className: "bg-blue-100 text-blue-800" },
    received: { label: "مستلمة", icon: CheckCircle, className: "bg-green-100 text-green-800" },
};

interface RemittancesTableProps {
  remittances: Remittance[];
  onSuccess: () => void;
}

export default function RemittancesTable({ remittances, onSuccess }: RemittancesTableProps) {
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
  
  const usersById = useMemo(() => new Map(navData?.users?.map(u => [u.uid, u.name])), [navData?.users]);
  const boxesById = useMemo(() => new Map(navData?.boxes?.map(b => [b.id, b.name])), [navData?.boxes]);
    
  if(!isDataLoaded) {
    return <div className="text-center p-8">جاري تحميل البيانات...</div>
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>التاريخ</TableHead>
            <TableHead>الشركة</TableHead>
            <TableHead>المكتب</TableHead>
            <TableHead>المبلغ (USD)</TableHead>
            <TableHead>المبلغ (IQD)</TableHead>
            <TableHead>الصندوق</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {remittances.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">لا توجد حوالات لعرضها.</TableCell>
            </TableRow>
          ) : remittances.map(r => {
            const status = statusConfig[r.status];
            const assignedToName = usersById.get(r.assignedToUid) || 'غير معروف';
            const boxName = boxesById.get(r.boxId) || 'غير معروف';

            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{format(new Date(r.createdAt), 'yyyy-MM-dd')}</div>
                  <div className="text-xs text-muted-foreground">بواسطة: {r.createdBy}</div>
                </TableCell>
                <TableCell>{r.companyName}</TableCell>
                <TableCell>{r.officeName}</TableCell>
                <TableCell className="font-mono text-right">{r.totalAmountUsd?.toLocaleString()}</TableCell>
                <TableCell className="font-mono text-right">{r.totalAmountIqd?.toLocaleString()}</TableCell>
                <TableCell>
                    <div>{boxName}</div>
                    <div className="text-xs text-muted-foreground">المخول: {assignedToName}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("gap-1.5", status.className)}>
                    <status.icon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {r.status === 'pending_audit' && (
                                <AuditRemittanceDialog remittance={r} onSuccess={onSuccess} />
                            )}
                             {r.status === 'pending_reception' && (
                                <ConfirmReceiptDialog remittance={r} onSuccess={onSuccess} />
                            )}
                            {r.status !== 'received' && <DropdownMenuItem>تعديل</DropdownMenuItem>}
                            <DropdownMenuItem className="text-destructive focus:text-destructive">حذف</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            )})}
        </TableBody>
      </Table>
    </div>
  );
}
