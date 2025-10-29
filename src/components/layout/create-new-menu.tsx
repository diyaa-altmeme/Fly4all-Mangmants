"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, FileDown, GitBranch, FileUp, BookUser, CreditCard, Ticket, Users, Banknote } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

// === حوارات الإنشاء الموجودة في مشروعك (استنادًا لمساراتك السابقة)
import NewStandardReceiptDialog from "@/app/accounts/vouchers/components/new-standard-receipt-dialog";
import NewDistributedReceiptDialog from "@/components/vouchers/components/new-distributed-receipt-dialog";
import NewPaymentVoucherDialog from "@/components/vouchers/components/new-payment-voucher-dialog";
import NewExpenseVoucherDialog from "@/components/vouchers/components/new-expense-voucher-dialog";
import NewJournalVoucherDialog from "@/components/vouchers/components/new-journal-voucher-dialog";
import AddClientDialog from "@/app/clients/components/add-client-dialog";

export default function CreateNewMenu() {
  const router = useRouter();
  const onChanged = () => router.refresh();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          إنشاء جديد
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" dir="rtl">
        {/* سندات */}
        <Dialog modal={false}>
          <NewStandardReceiptDialog onVoucherAdded={onChanged}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                <span>سند قبض عادي</span>
                <FileDown className="h-4 w-4" />
              </DropdownMenuItem>
            </DialogTrigger>
          </NewStandardReceiptDialog>
        </Dialog>

        <Dialog modal={false}>
          <NewDistributedReceiptDialog onVoucherAdded={onChanged}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                <span>سند قبض مخصص</span>
                <GitBranch className="h-4 w-4" />
              </DropdownMenuItem>
            </DialogTrigger>
          </NewDistributedReceiptDialog>
        </Dialog>

        <Dialog modal={false}>
          <NewPaymentVoucherDialog onVoucherAdded={onChanged}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                <span>سند دفع</span>
                <FileUp className="h-4 w-4" />
              </DropdownMenuItem>
            </DialogTrigger>
          </NewPaymentVoucherDialog>
        </Dialog>

        <Dialog modal={false}>
          <NewExpenseVoucherDialog onVoucherAdded={onChanged}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                <span>سند مصاريف</span>
                <Banknote className="h-4 w-4" />
              </DropdownMenuItem>
            </DialogTrigger>
          </NewExpenseVoucherDialog>
        </Dialog>

        <Dialog modal={false}>
          <NewJournalVoucherDialog onVoucherAdded={onChanged}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                <span>سند قيد داخلي</span>
                <BookUser className="h-4 w-4" />
              </DropdownMenuItem>
            </DialogTrigger>
          </NewJournalVoucherDialog>
        </Dialog>

        <DropdownMenuSeparator />

        {/* عمليات */}
        <DropdownMenuItem asChild>
          <Link href="/bookings" className="justify-between">
            <span>حجز طيران جديد</span>
            <Ticket className="h-4 w-4" />
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/visas" className="justify-between">
            <span>حجز فيزا جديد</span>
            <CreditCard className="h-4 w-4" />
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* علاقات */}
        <Dialog modal={false}>
          <AddClientDialog onClientAdded={onChanged} onClientUpdated={onChanged}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                <span>إضافة علاقة</span>
                <Users className="h-4 w-4" />
              </DropdownMenuItem>
            </DialogTrigger>
          </AddClientDialog>
        </Dialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
