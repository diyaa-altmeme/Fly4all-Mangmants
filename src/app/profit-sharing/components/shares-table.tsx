
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ProfitShare } from "../actions";
import AddEditShareDialog from "./add-edit-share-dialog";
import { deleteProfitShare } from "../actions";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { Currency } from "@/lib/types";


interface SharesTableProps {
  shares: ProfitShare[];
  partners: { id: string, name: string }[];
  totalProfit: number;
  onDataChange: () => void;
  currency: Currency;
  isManual: boolean;
}

export default function SharesTable({ shares, partners, totalProfit, onDataChange, currency, isManual }: SharesTableProps) {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
      const result = await deleteProfitShare(id);
      if (result.success) {
          toast({ title: "تم حذف الحصة بنجاح" });
          onDataChange();
      } else {
          toast({ title: "خطأ", description: result.error, variant: 'destructive' });
      }
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold text-center">الشريك</TableHead>
            <TableHead className="text-center font-bold">النسبة</TableHead>
            <TableHead className="text-center font-bold">المبلغ</TableHead>
            <TableHead className="font-bold text-center">ملاحظات</TableHead>
            <TableHead className="text-center font-bold">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shares.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">لا توجد توزيعات لهذه الفترة.</TableCell>
            </TableRow>
          ) : (
            shares.map((share) => (
              <TableRow key={share.id}>
                <TableCell className="font-medium text-center">{share.partnerName}</TableCell>
                <TableCell className="text-center font-mono">{share.percentage.toFixed(2)}%</TableCell>
                <TableCell className="text-center font-mono font-bold text-green-600">{share.amount.toLocaleString()} {currency}</TableCell>
                <TableCell className="text-center">{share.notes || "-"}</TableCell>
                <TableCell className="text-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isManual}><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <AddEditShareDialog
                                isEditing
                                share={share}
                                monthId={share.profitMonthId}
                                totalProfit={totalProfit}
                                partners={partners}
                                onSuccess={onDataChange}
                                disabled={isManual}
                            >
                                <DropdownMenuItem onSelect={e => e.preventDefault()} disabled={isManual}><Edit className="me-2 h-4 w-4"/> تعديل</DropdownMenuItem>
                            </AddEditShareDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive" disabled={isManual}><Trash2 className="me-2 h-4 w-4"/> حذف</DropdownMenuItem>
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
