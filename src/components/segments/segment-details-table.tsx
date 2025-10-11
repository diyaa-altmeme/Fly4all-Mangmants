
"use client";

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Calculator } from 'lucide-react';
import type { SegmentEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
};

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

const CalculationPopover = ({ title, calculations }: { title: string, calculations: { label: string, value: string }[] }) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="link" className="p-0 h-auto font-mono hover:underline">{formatCurrency(parseFloat(calculations.find(c => c.label === 'الإجمالي')?.value.replace(/[^0-9.-]+/g,"") || '0'))}</Button>
        </PopoverTrigger>
        <PopoverContent className="w-60">
            <div className="space-y-2">
                <h4 className="font-medium leading-none">{title}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                    {calculations.map((calc, i) => (
                        <div key={i} className="flex justify-between items-center">
                            <span>{calc.label}:</span>
                            <span className="font-mono">{calc.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </PopoverContent>
    </Popover>
);


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
            const ticketCalcs = [
                { label: 'عدد التذاكر', value: `${entry.tickets}` },
                { label: 'الربح للقطعة', value: `${entry.clientSettingsUsed?.tickets?.value || 'N/A'}${entry.clientSettingsUsed?.tickets?.type === 'percentage' ? '%' : ''}` },
                { label: 'الإجمالي', value: formatCurrency(entry.ticketProfits) }
            ];
            
            const otherCalcs = [
                { label: 'أرباح الفيزا', value: formatCurrency(entry.visas * (entry.clientSettingsUsed?.visas?.value || 0)) },
                { label: 'أرباح الفنادق', value: formatCurrency(entry.hotels * (entry.clientSettingsUsed?.hotels?.value || 0)) },
                { label: 'أرباح الكروبات', value: formatCurrency(entry.groups * (entry.clientSettingsUsed?.groups?.value || 0)) },
                { label: 'الإجمالي', value: formatCurrency(entry.otherProfits) }
            ];

            return (
              <TableRow key={entry.id}>
                <TableCell className="font-semibold">{entry.companyName}</TableCell>
                <TableCell>{entry.partnerName}</TableCell>
                <TableCell className="font-mono">
                    <CalculationPopover title="تفاصيل أرباح التذاكر" calculations={ticketCalcs} />
                </TableCell>
                <TableCell className="font-mono">
                     <CalculationPopover title="تفاصيل الأرباح الأخرى" calculations={otherCalcs} />
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
