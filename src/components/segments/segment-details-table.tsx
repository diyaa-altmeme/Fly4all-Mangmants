
"use client";

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Calculator } from 'lucide-react';
import type { SegmentEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
};

interface CalculationPopoverProps {
  title: string;
  items: { label: string; count?: number | string; rate?: number | string; total: number }[];
  totalLabel: string;
  totalValue: number;
}

const CalculationPopover = ({ title, items, totalLabel, totalValue }: CalculationPopoverProps) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="link" className="p-0 h-auto font-mono hover:underline">{formatCurrency(totalValue)}</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
            <div className="space-y-3">
                <h4 className="font-medium leading-none">{title}</h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">البند</TableHead>
                            <TableHead className="text-center">العدد</TableHead>
                            <TableHead className="text-center">الربح/النسبة</TableHead>
                            <TableHead className="text-right">الإجمالي</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.label}</TableCell>
                                <TableCell className="text-center">{item.count ?? '-'}</TableCell>
                                <TableCell className="text-center font-mono">{item.rate ?? '-'}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(item.total)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                         <TableRow>
                            <TableCell colSpan={3} className="font-bold">{totalLabel}</TableCell>
                            <TableCell className="text-right font-bold font-mono">{formatCurrency(totalValue)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </PopoverContent>
    </Popover>
);


interface SegmentDetailsTableProps {
  period: {
    entries: SegmentEntry[];
    totalTickets: number;
    totalOther: number;
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
          <TableHead>أرباح التذاكر</TableHead>
          <TableHead>أرباح أخرى</TableHead>
          <TableHead>الإجمالي</TableHead>
          <TableHead>حصة الروضتين</TableHead>
          <TableHead>حصة الشريك</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {period.entries.map((entry) => {
            const ticketCalcs = [{
                label: 'التذاكر',
                count: entry.tickets,
                rate: `${entry.clientSettingsUsed?.ticketProfitPercentage || 'N/A'}%`,
                total: entry.ticketProfits
            }];
            
            const otherCalcs = [
                { label: 'الفيزا', count: entry.visas, rate: formatCurrency(entry.clientSettingsUsed?.visas?.value || 0), total: entry.visas * (entry.clientSettingsUsed?.visas?.value || 0) },
                { label: 'الفنادق', count: entry.hotels, rate: formatCurrency(entry.clientSettingsUsed?.hotels?.value || 0), total: entry.hotels * (entry.clientSettingsUsed?.hotels?.value || 0) },
                { label: 'الكروبات', count: entry.groups, rate: formatCurrency(entry.clientSettingsUsed?.groups?.value || 0), total: entry.groups * (entry.clientSettingsUsed?.groups?.value || 0) },
            ];

            return (
              <TableRow key={entry.id}>
                <TableCell className="font-semibold">{entry.companyName}</TableCell>
                <TableCell>{entry.partnerName}</TableCell>
                <TableCell className="font-mono">
                    <CalculationPopover title="تفاصيل أرباح التذاكر" items={ticketCalcs} totalLabel="إجمالي ربح التذاكر" totalValue={entry.ticketProfits} />
                </TableCell>
                <TableCell className="font-mono">
                     <CalculationPopover title="تفاصيل الأرباح الأخرى" items={otherCalcs} totalLabel="إجمالي الأرباح الأخرى" totalValue={entry.otherProfits} />
                </TableCell>
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
          <TableCell>{formatCurrency(period.totalTickets)}</TableCell>
          <TableCell>{formatCurrency(period.totalOther)}</TableCell>
          <TableCell>{formatCurrency(period.totalProfit)}</TableCell>
          <TableCell className="text-green-600">{formatCurrency(period.totalAlrawdatainShare)}</TableCell>
          <TableCell className="text-blue-600">{formatCurrency(period.totalPartnerShare)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
