

"use client";

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Calculator } from 'lucide-react';
import type { SegmentEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const formatCurrency = (amount?: number): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
};


interface SegmentDetailsTableProps {
  period: {
    entries: SegmentEntry[];
    totalProfit: number;
    totalAlrawdatainShare: number;
    totalPartnerShare: number;
  };
  onDeleteEntry: (id: string) => void;
}

export default function SegmentDetailsTable({ period, onDeleteEntry }: SegmentDetailsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>الشركة</TableHead>
          <TableHead>الشريك</TableHead>
          <TableHead>إجمالي الربح</TableHead>
          <TableHead>حصة الروضتين</TableHead>
          <TableHead>حصة الشريك</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {period.entries.map((entry) => {
            return (
              <TableRow key={entry.id}>
                <TableCell className="font-semibold">{entry.companyName}</TableCell>
                <TableCell>{entry.partnerName}</TableCell>
                <TableCell className="font-mono font-bold">{formatCurrency(entry.total)}</TableCell>
                <TableCell className="font-mono text-green-600">{formatCurrency(entry.alrawdatainShare)}</TableCell>
                <TableCell className="font-mono text-blue-600">{formatCurrency(entry.partnerShare)}</TableCell>
              </TableRow>
            )
        })}
      </TableBody>
       <TableFooter>
        <TableRow className="bg-muted font-bold">
          <TableCell colSpan={2}>المجموع</TableCell>
          <TableCell>{formatCurrency(period.totalProfit)}</TableCell>
          <TableCell className="text-green-600">{formatCurrency(period.totalAlrawdatainShare)}</TableCell>
          <TableCell className="text-blue-600">{formatCurrency(period.totalPartnerShare)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
