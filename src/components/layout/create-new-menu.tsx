
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, FileDown, GitBranch, FileUp, BookUser, CreditCard, Ticket, Users, Banknote } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

// Dialogs
import NewStandardReceiptDialog from "@/app/accounts/vouchers/components/new-standard-receipt-dialog";
import NewDistributedReceiptDialog from "@/components/vouchers/components/new-distributed-receipt-dialog";
import NewPaymentVoucherDialog from "@/components/vouchers/components/new-payment-voucher-dialog";
import NewExpenseVoucherDialog from "@/components/vouchers/components/new-expense-voucher-dialog";
import NewJournalVoucherDialog from "@/components/vouchers/components/new-journal-voucher-dialog";
import AddClientDialog from "@/app/clients/components/add-client-dialog";
import AddBookingDialog from "@/app/bookings/components/add-booking-dialog";
import AddVisaDialog from "@/app/visas/components/add-visa-dialog";

export default function CreateNewMenu() {
  const router = useRouter();
  const onChanged = () => router.refresh();

  const voucherItems = [
    { Dialog: NewStandardReceiptDialog, label: "سند قبض عادي", icon: FileDown, onSave: onChanged },
    { Dialog: NewDistributedReceiptDialog, label: "سند قبض مخصص", icon: GitBranch, onSave: onChanged },
    { Dialog: NewPaymentVoucherDialog, label: "سند دفع", icon: FileUp, onSave: onChanged },
    { Dialog: NewExpenseVoucherDialog, label: "سند مصاريف", icon: Banknote, onSave: onChanged },
    { Dialog: NewJournalVoucherDialog, label: "سند قيد داخلي", icon: BookUser, onSave: onChanged },
  ];
  
  const mainItems = [
      { Dialog: AddBookingDialog, label: "حجز طيران", icon: Ticket, onSave: onChanged, props: { onBookingAdded: onChanged } },
      { Dialog: AddVisaDialog, label: "طلب فيزا", icon: CreditCard, onSave: onChanged, props: { onBookingAdded: onChanged } },
      { Dialog: AddClientDialog, label: "إضافة علاقة", icon: Users, onSave: onChanged, props: { onClientAdded: onChanged, onClientUpdated: onChanged } },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          إنشاء جديد
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" dir="rtl">
        
        {mainItems.map(({ Dialog, label, icon: Icon, onSave, props }) => (
            <Dialog key={label} modal={false}>
                <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                        <span>{label}</span>
                        <Icon className="h-4 w-4" />
                    </DropdownMenuItem>
                </DialogTrigger>
                <Dialog><DialogContent><p>placeholder</p></DialogContent></Dialog>
            </Dialog>
        ))}

        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="justify-between">
                <span>إنشاء سند</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                {voucherItems.map(({ Dialog, label, icon: Icon, onSave }) => (
                    <Dialog key={label} modal={false}>
                        <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                                <span>{label}</span>
                                <Icon className="h-4 w-4" />
                            </DropdownMenuItem>
                        </DialogTrigger>
                        <Dialog><DialogContent><p>placeholder</p></DialogContent></Dialog>
                    </Dialog>
                ))}
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
        
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    