
"use client";

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Calculator, Percent } from 'lucide-react';
import type { SegmentEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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

const CalculationDetailsPopover = ({ entry }: { entry: SegmentEntry }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><Calculator className="h-4 w-4"/></Button>
            </PopoverTrigger>
            <PopoverContent>
                <div className="space-y-2 text-sm">
                    <h4 className="font-bold">تفاصيل الحسبة</h4>
                    <p>التذاكر: {entry.tickets} * {entry.ticketProfitPercentage}% = {formatCurrency(entry.ticketProfits)}</p>
                    <p>الفيزا: {entry.visas} * {entry.visaProfitPercentage}% = {formatCurrency(entry.visas * (entry.visaProfitPercentage/100))}</p>
                    <p>الفنادق: {entry.hotels} * {entry.hotelProfitPercentage}% = {formatCurrency(entry.hotels * (entry.hotelProfitPercentage/100))}</p>
                    <p>الكروبات: {entry.groups} * {entry.groupProfitPercentage}% = {formatCurrency(entry.groups * (entry.groupProfitPercentage/100))}</p>
                    <p className="border-t pt-2 mt-2 font-bold">حصة الروضتين: {formatCurrency(entry.total)} * {entry.alrawdatainSharePercentage}% = {formatCurrency(entry.alrawdatainShare)}</p>
                </div>
            </PopoverContent>
        </Popover>
    )
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
          <TableHead>الحسبة</TableHead>
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
                <TableCell>
                    <CalculationDetailsPopover entry={entry} />
                </TableCell>
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
          <TableCell></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
