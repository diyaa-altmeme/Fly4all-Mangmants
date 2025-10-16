
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2, Landmark, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ProfitShare } from "../actions";
import AddEditShareDialog from "./add-edit-share-dialog";
import { deleteProfitShare } from "../actions";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { Currency } from "@/lib/types";
import React from "react";
import Link from 'next/link';


interface SharesTableProps {
  shares: ProfitShare[];
  partners: { id: string, name: string }[];
  totalProfit: number;
  onDataChange: () => void;
  currency: Currency;
  isManual: boolean;
  monthId: string;
}

export default function SharesTable({ shares, partners, totalProfit, onDataChange, currency, isManual, monthId }: SharesTableProps) {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
      const result = await deleteProfitShare(id);
      if (result.success) {
          toast({ title: "تم حذف الحصة بنجاح" });
          onDataChange();
      } else {
          toast({ title: "خطأ", description: result.error, variant: "destructive" });
      }
  };

  const { partnerShares, companyShare } = React.useMemo(() => {
    let totalPartnerPercentage = 0;
    
    const enrichedPartnerShares = shares.map(share => {
        totalPartnerPercentage += share.percentage;
        const partner = partners.find(p => p.id === share.partnerId);
        return {
            ...share,
            partnerName: partner?.name || share.partnerName,
        };
    });

    const companyPercentage = 100 - totalPartnerPercentage;
    const companyAmount = totalProfit * (companyPercentage / 100);

    const companyShareRow: ProfitShare = {
      id: 'company-share',
      profitMonthId: monthId,
      partnerId: 'alrawdatain',
      partnerName: 'حصالة الشركة',
      percentage: companyPercentage > 0.001 ? companyPercentage : 0,
      amount: companyAmount > 0.001 ? companyAmount : 0,
      notes: 'الحصة المتبقية للشركة',
      invoiceNumber: shares.find(s => s.partnerId === 'alrawdatain_share')?.invoiceNumber,
    };

    return {
      partnerShares: enrichedPartnerShares,
      companyShare: companyShareRow,
    };
}, [shares, partners, totalProfit, monthId]);

  const allRows = [companyShare, ...partnerShares].filter(row => row.percentage > 0.001); // Filter out zero-percentage rows
  const totalAmountDistributed = allRows.reduce((sum, row) => sum + row.amount, 0);


  return (
    <div className="border rounded-lg overflow-x-auto bg-background text-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold p-2 text-right">الشريك</TableHead>
            <TableHead className="font-bold p-2 text-right">رقم الفاتورة</TableHead>
            <TableHead className="text-center font-bold p-2">النسبة</TableHead>
            <TableHead className="text-right font-bold p-2">المبلغ</TableHead>
            <TableHead className="font-bold text-right p-2">ملاحظات</TableHead>
            <TableHead className="text-center font-bold p-2">
                 <AddEditShareDialog 
                    monthId={monthId} 
                    totalProfit={totalProfit}
                    partners={partners}
                    onSuccess={onDataChange}
                    disabled={!isManual}
                >
                    <Button variant="ghost" size="sm" disabled={!isManual}>إضافة</Button>
                </AddEditShareDialog>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allRows.length === 0 ? (
            <TableRow>
                 <TableCell className="font-semibold p-2 text-right flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-green-600"/>
                    حصالة الشركة
                </TableCell>
                <TableCell className="text-center font-mono p-2">
                    -
                </TableCell>
                <TableCell className="text-center font-mono p-2">100.00%</TableCell>
                <TableCell className="text-right font-mono font-bold p-2">{totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {currency}</TableCell>
                <TableCell className="text-right p-2"> كامل الربح للشركة </TableCell>
                <TableCell className="text-center p-2"></TableCell>
            </TableRow>
          ) : (
            allRows.map((share, index) => (
              <TableRow key={share.id} className={share.id === 'company-share' ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                <TableCell className="font-semibold p-2 text-right flex items-center gap-2">
                    {share.id === 'company-share' && <Landmark className="h-4 w-4 text-green-600"/>}
                    {share.partnerName}
                </TableCell>
                 <TableCell className="text-center font-mono p-2 text-xs">
                    {share.invoiceNumber ? (
                        <Button asChild variant="link" className="p-0 h-auto text-xs">
                            <Link href={`/accounts/vouchers/list`}>{share.invoiceNumber}</Link>
                        </Button>
                    ) : '-'}
                </TableCell>
                <TableCell className="text-center font-mono p-2">{share.percentage.toFixed(2)}%</TableCell>
                <TableCell className="text-right font-mono font-bold p-2">{share.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {currency}</TableCell>
                <TableCell className="text-right p-2">{share.notes || "-"}</TableCell>
                <TableCell className="text-center p-2">
                  {share.id !== 'company-share' && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={!isManual}><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <AddEditShareDialog
                                isEditing
                                share={share}
                                monthId={share.profitMonthId}
                                totalProfit={totalProfit}
                                partners={partners}
                                onSuccess={onDataChange}
                                disabled={!isManual}
                            >
                                <DropdownMenuItem onSelect={e => e.preventDefault()} disabled={!isManual}><Edit className="me-2 h-4 w-4"/> تعديل</DropdownMenuItem>
                            </AddEditShareDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive" disabled={!isManual}><Trash2 className="me-2 h-4 w-4"/> حذف</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء سيحذف الحصة بشكل دائم.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(share.id)} className={cn(buttonVariants({variant: "destructive"}))}>حذف</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
         <TableFooter>
            <TableRow>
                <TableCell colSpan={2} className="font-bold">المجموع</TableCell>
                <TableCell className="text-center font-bold font-mono">100.00%</TableCell>
                <TableCell className="text-right font-bold font-mono">{totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {currency}</TableCell>
                <TableCell colSpan={2}></TableCell>
            </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
