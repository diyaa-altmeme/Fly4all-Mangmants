

"use client";

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Calculator, Percent } from 'lucide-react';
import type { SegmentEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const formatCurrency = (amount?: number, currency?: string): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '$0.00';
    }
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || 'USD'}`;
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
                    <p>التذاكر: {entry.tickets} * {entry.ticketProfitType === 'percentage' ? `${entry.ticketProfitValue}%` : formatCurrency(entry.ticketProfitValue, entry.currency)} = {formatCurrency(entry.ticketProfits, entry.currency)}</p>
                    <p>الفيزا: {entry.visas} * {entry.visaProfitType === 'percentage' ? `${entry.visaProfitValue}%` : formatCurrency(entry.visaProfitValue, entry.currency)} = {formatCurrency(entry.visas * (entry.visaProfitType === 'percentage' ? (entry.visaProfitValue / 100) : entry.visaProfitValue), entry.currency)}</p>
                    <p>الفنادق: {entry.hotels} * {entry.hotelProfitType === 'percentage' ? `${entry.hotelProfitValue}%` : formatCurrency(entry.hotelProfitValue, entry.currency)} = {formatCurrency(entry.hotels * (entry.hotelProfitType === 'percentage' ? (entry.hotelProfitValue / 100) : entry.hotelProfitValue), entry.currency)}</p>
                    <p>الكروبات: {entry.groups} * {entry.groupProfitType === 'percentage' ? `${entry.groupProfitValue}%` : formatCurrency(entry.groupProfitValue, entry.currency)} = {formatCurrency(entry.groups * (entry.groupProfitType === 'percentage' ? (entry.groupProfitValue / 100) : entry.groupProfitValue), entry.currency)}</p>
                    <p className="border-t pt-2 mt-2 font-bold">حصة الروضتين: {formatCurrency(entry.total, entry.currency)} * {entry.alrawdatainSharePercentage}% = {formatCurrency(entry.alrawdatainShare, entry.currency)}</p>
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
                <TableCell className="font-mono font-bold">{formatCurrency(entry.total, entry.currency)}</TableCell>
                <TableCell className="font-mono text-green-600">{formatCurrency(entry.alrawdatainShare, entry.currency)}</TableCell>
                <TableCell className="font-mono text-blue-600">{formatCurrency(entry.partnerShare, entry.currency)}</TableCell>
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
