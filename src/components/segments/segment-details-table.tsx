
"use client";

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { SegmentEntry } from '@/lib/types';

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

interface SegmentDetailsTableProps {
  period: {
    entries: SegmentEntry[];
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
          <TableHead>أرباح التذاكر</TableHead>
          <TableHead>أرباح أخرى</TableHead>
          <TableHead>الإجمالي</TableHead>
          <TableHead className="text-center">حذف</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {period.entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-semibold">{entry.companyName}</TableCell>
            <TableCell>{entry.partnerName}</TableCell>
            <TableCell className="font-mono">{formatCurrency(entry.ticketProfits)}</TableCell>
            <TableCell className="font-mono">{formatCurrency(entry.otherProfits)}</TableCell>
            <TableCell className="font-mono font-bold">{formatCurrency(entry.total)}</TableCell>
            <TableCell className="text-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onDeleteEntry(entry.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
