
"use client";

import * as React from "react";
import BookingsTable from "./bookings-table";
import type { BookingEntry, Client, Supplier, Box, Currency, AppSettings, JournalVoucher } from "@/lib/types";
import { PlusCircle, ChevronsUpDown, Filter, Wand2, Loader2, RefreshCw, FileSpreadsheet, History, Plane } from "lucide-react";
import AddBookingDialog from "./add-booking-dialog";
import { Button } from "@/components/ui/button";
import { produce } from "immer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import InlineNewBookingForm from "./inline-new-booking-form";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import Link from 'next/link';
import SmartTicketEntryDialog from "./smart-ticket-entry-dialog";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { useRouter } from "next/navigation";
import TicketOperationsDialog from "./ticket-operations-dialog";
import { useReactTable, getCoreRowModel, getPaginationRowModel } from "@tanstack/react-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface BookingsContentProps {
  initialData: BookingEntry[];
  totalBookings: number;
}

export default function BookingsContent({
  initialData,
  totalBookings
}: BookingsContentProps) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [showInlineForm, setShowInlineForm] = React.useState(false);
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
  
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
  
  const onDataChanged = () => {
    router.refresh();
  };

  const addBookingToState = (newBooking: BookingEntry) => {
    setData(produce(draft => {
      draft.unshift(newBooking);
    }));
  };

  const addMultipleBookingsToState = (newBookings: BookingEntry[]) => {
    router.refresh();
  }

  const updateBookingInState = (updatedBooking: BookingEntry) => {
    setData(produce(draft => {
      const index = draft.findIndex(b => b.id === updatedBooking.id);
      if (index !== -1) {
        draft[index] = updatedBooking;
      }
    }));
  };
  
  const deleteBookingFromState = (bookingId: string) => {
      setData(produce(draft => {
          return draft.filter(b => b.id !== bookingId);
      }));
  };

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const filteredData = React.useMemo(() => {
    if (!navData) return [];
    
    return data.filter(booking => {
      // Currency Filter
      if (appliedFilters.currencyFilter !== 'all' && booking.currency !== appliedFilters.currencyFilter) {
        return false;
      }
      
      const supplierName = navData.suppliers.find(s => s.id === booking.supplierId)?.name || '';
      const clientName = navData.clients.find(c => c.id === booking.clientId)?.name || '';

      // Staged Search Field Filter
      if (appliedFilters.searchField !== 'all') {
         const filterTerm = debouncedSearchTerm.toLowerCase();
         if (!filterTerm) return true; // Don't filter if search is empty
         
         switch (appliedFilters.searchField) {
            case "pnr": return (booking.pnr || '').toLowerCase().includes(filterTerm);
            case "passenger": return booking.passengers.some(p => (p.name || '').toLowerCase().includes(filterTerm));
            case "ticket": return booking.passengers.some(p => (p.ticketNumber || '').toLowerCase().includes(filterTerm));
            case "supplier": return supplierName.toLowerCase().includes(filterTerm);
            case "client": return clientName.toLowerCase().includes(filterTerm);
         }
      }
      
      // Live Search Term Filter (for 'all' field)
      if (debouncedSearchTerm && appliedFilters.searchField === 'all') {
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        return (
          (booking.pnr || '').toLowerCase().includes(lowercasedTerm) ||
          (booking.route || '').toLowerCase().includes(lowercasedTerm) ||
          supplierName.toLowerCase().includes(lowercasedTerm) ||
          clientName.toLowerCase().includes(lowercasedTerm) ||
          booking.passengers.some(p => 
            (p.name || '').toLowerCase().includes(lowercasedTerm) ||
            (p.ticketNumber || '').toLowerCase().includes(lowercasedTerm)
          )
        );
      }
      
      return true;
    });
  }, [debouncedSearchTerm, data, navData, appliedFilters]);

  if (!isDataLoaded || !navData) {
      return (
          <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  
  return (
    <div className="space-y-4">
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex w-full sm:w-auto items-center gap-2">
                 <AddBookingDialog
                    onBookingAdded={addBookingToState}
                >
                  <Button><PlusCircle className="me-2 h-4 w-4" /> إضافة حجز جديد</Button>
                </AddBookingDialog>
                 <TicketOperationsDialog onDataChanged={onDataChanged} />
                 <Button asChild variant="outline">
                    <Link href="/bookings/deleted-bookings">
                        <History className="me-2 h-4 w-4"/>
                        سجل المحذوفات
                    </Link>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">إضافة سريعة <ChevronsUpDown className="ms-2 h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setShowInlineForm(prev => !prev)}>إدخال يدوي سريع</DropdownMenuItem>
                        <SmartTicketEntryDialog onMultipleBookingsAdded={addMultipleBookingsToState}>
                             <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Wand2 className="me-2 h-4 w-4" />
                                الإدخال الذكي (PDF)
                            </DropdownMenuItem>
                        </SmartTicketEntryDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
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
                        <SelectItem value="pnr">PNR</SelectItem>
                        <SelectItem value="passenger">اسم المسافر</SelectItem>
                        <SelectItem value="ticket">رقم التذكرة</SelectItem>
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
        
        {showInlineForm && (
            <InlineNewBookingForm
                onBookingAdded={(newBooking) => {
                    addBookingToState(newBooking);
                    setShowInlineForm(false);
                }}
                onCancel={() => setShowInlineForm(false)}
            />
        )}


        <Card>
            <CardContent className="p-0">
                 <BookingsTable
                    bookings={filteredData}
                    totalBookings={totalBookings}
                    onBookingUpdated={updateBookingInState}
                    onBookingDeleted={deleteBookingFromState}
                />
            </CardContent>
        </Card>
    </div>
  );
}
