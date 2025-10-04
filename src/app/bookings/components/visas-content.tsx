
"use client";

import * as React from "react";
import VisasTable from "./visas-table";
import type { VisaBookingEntry, Client, Supplier, Box, Currency } from "@/lib/types";
import { PlusCircle, ChevronsUpDown, Filter, History, Wand2, FileSpreadsheet } from "lucide-react";
import AddVisaDialog from "./add-visa-dialog";
import { Button } from "@/components/ui/button";
import { produce } from "immer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import InlineNewVisaForm from "./inline-new-visa-form";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVoucherNav } from "@/context/voucher-nav-context";
import SmartVisaEntryDialog from "./smart-visa-entry-dialog";


interface VisasContentProps {
  initialData: VisaBookingEntry[];
}

export default function VisasContent({
  initialData,
}: VisasContentProps) {
  
  const [data, setData] = React.useState(initialData);
  const [showInlineForm, setShowInlineForm] = React.useState(false);
  const router = useRouter();
  const { data: navData } = useVoucherNav();


  // Live search
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Staged filters
  const [stagedFilters, setStagedFilters] = React.useState({
    searchField: "all",
    currencyFilter: 'all' as Currency | 'all',
  });
  
  // Applied filters
  const [appliedFilters, setAppliedFilters] = React.useState(stagedFilters);
  
  const handleApplyFilters = () => {
      setAppliedFilters(stagedFilters);
  };

  const addBookingToState = (newBooking: VisaBookingEntry) => {
    setData(produce(draft => {
      draft.unshift(newBooking);
    }));
  };

  const addMultipleBookingsToState = (newBookings: VisaBookingEntry[]) => {
    router.refresh();
  }
  
  const handleBookingUpdated = (updatedBooking: VisaBookingEntry) => {
      setData(produce(draft => {
          const index = draft.findIndex(b => b.id === updatedBooking.id);
          if (index !== -1) {
              draft[index] = updatedBooking;
          }
      }));
       router.refresh();
  };
  
  const handleBookingDeleted = (bookingId: string) => {
      setData(prevData => prevData.filter(b => b.id !== bookingId));
      router.refresh();
  };

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const filteredData = React.useMemo(() => {
    return data.filter(booking => {
      if (appliedFilters.currencyFilter !== 'all' && booking.currency !== appliedFilters.currencyFilter) {
        return false;
      }
      
      const supplierName = navData?.suppliers.find(s => s.id === booking.supplierId)?.name || '';
      const clientName = navData?.clients.find(c => c.id === booking.clientId)?.name || '';

      const filterField = appliedFilters.searchField;

      if (filterField !== 'all') {
         const filterTerm = debouncedSearchTerm.toLowerCase();
         if (!filterTerm) return true;
         
          switch (filterField) {
            case "applicationNumber": return booking.passengers.some(p => (p.applicationNumber || '').toLowerCase().includes(filterTerm));
            case "passenger": return booking.passengers.some(p => (p.name || '').toLowerCase().includes(filterTerm));
            case "passport": return booking.passengers.some(p => (p.passportNumber || '').toLowerCase().includes(filterTerm));
            case "supplier": return supplierName.toLowerCase().includes(filterTerm);
            case "client": return clientName.toLowerCase().includes(filterTerm);
            default: return true;
          }
      }

      if (debouncedSearchTerm && filterField === 'all') {
          const lowercasedTerm = debouncedSearchTerm.toLowerCase();
          return (booking.notes || '').toLowerCase().includes(lowercasedTerm) ||
                (booking.invoiceNumber || '').toLowerCase().includes(lowercasedTerm) ||
                supplierName.toLowerCase().includes(lowercasedTerm) ||
                clientName.toLowerCase().includes(lowercasedTerm) ||
                booking.passengers.some(p => 
                  (p.name || '').toLowerCase().includes(lowercasedTerm) ||
                  (p.applicationNumber || '').toLowerCase().includes(lowercasedTerm) ||
                  (p.passportNumber || '').toLowerCase().includes(lowercasedTerm)
                )
      }

      return true;
    });
  }, [debouncedSearchTerm, data, navData, appliedFilters]);

  
  return (
    <div className="space-y-4">
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex w-full sm:w-auto items-center gap-2">
                 <AddVisaDialog
                    onBookingAdded={addBookingToState}
                />
                 <SmartVisaEntryDialog onMultipleBookingsAdded={addMultipleBookingsToState}>
                    <Button variant="outline"><Wand2 className="me-2 h-4 w-4" /> الإدخال الذكي (AI)</Button>
                </SmartVisaEntryDialog>
                <Button variant="outline"><FileSpreadsheet className="me-2 h-4 w-4" /> استيراد من Excel</Button>
                  <Button asChild variant="outline">
                    <Link href="/visas/deleted-visas">
                        <History className="me-2 h-4 w-4"/>
                        سجل المحذوفات
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-2 w-full flex-wrap sm:w-auto sm:flex-nowrap justify-end">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="بحث..."
                        className="ps-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <Select value={stagedFilters.searchField} onValueChange={(v) => setStagedFilters(f => ({...f, searchField: v}))}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">بحث عام</SelectItem>
                        <SelectItem value="applicationNumber">رقم الطلب</SelectItem>
                        <SelectItem value="passenger">اسم المسافر</SelectItem>
                        <SelectItem value="passport">رقم الجواز</SelectItem>
                        <SelectItem value="supplier">المورد</SelectItem>
                        <SelectItem value="client">العميل</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={stagedFilters.currencyFilter} onValueChange={(v) => setStagedFilters(f => ({...f, currencyFilter: v as any}))}>
                    <SelectTrigger className="w-full sm:w-[120px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل العملات</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="IQD">IQD</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
                    <Filter className="me-2 h-4 w-4" />
                    تطبيق
                </Button>
            </div>
        </div>
        
        {showInlineForm && navData?.boxes && (
            <InlineNewVisaForm
                onBookingAdded={(newBooking) => {
                    addBookingToState(newBooking);
                    setShowInlineForm(false);
                }}
                onCancel={() => setShowInlineForm(false)}
            />
        )}


        <Card>
            <CardContent className="p-0">
                 <VisasTable
                    bookings={filteredData}
                    clients={navData?.clients || []}
                    suppliers={navData?.suppliers || []}
                    boxes={navData?.boxes || []}
                    onBookingDeleted={handleBookingDeleted}
                    onBookingUpdated={handleBookingUpdated}
                />
            </CardContent>
        </Card>
    </div>
  );
}
