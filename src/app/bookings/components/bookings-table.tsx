
"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BookingEntry, Passenger, Currency, Client, Supplier, TicketType, JournalVoucher } from '@/lib/types';
import { ChevronDown, Edit, Trash2, MoreVertical, ShieldCheck, CheckCircle, CircleDotDashed, ArrowDown, ArrowUp, DollarSign, User as UserIcon, Building, Ticket, RefreshCw, X, GitBranch, Banknote, BookUser, FileUp, FileDown, Layers3, Repeat, Eye, AlertTriangle, UserSquare, Baby, UserRound, Passport } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { softDeleteBooking } from '../actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import BookingDialog from './add-booking-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useReactTable, getCoreRowModel, getPaginationRowModel } from '@tanstack/react-table';


interface BookingsTableProps {
  bookings: BookingEntry[];
  totalBookings: number;
  onBookingUpdated: (updatedBooking: BookingEntry) => void;
  onBookingDeleted: (bookingId: string) => void;
}

const formatCurrency = (amount: number | null | undefined, currency: Currency) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '-';
    return new Intl.NumberFormat('en-US').format(amount) + ` ${currency}`;
}

const PriceDisplay = ({ amount, currency, icon: Icon, colorClass, title }: { amount: number | null, currency: Currency, icon: React.ElementType, colorClass: string, title: string }) => {
    if (amount === null || typeof amount !== 'number' || !isFinite(amount)) {
        return <span className="text-muted-foreground">-</span>
    }
    return (
        <div className="flex items-center gap-2 justify-center" title={title}>
            <Icon className={cn("h-4 w-4", colorClass)} />
            <span className={cn("font-mono font-semibold", colorClass)}>
                {amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
        </div>
    )
}

const OperationTypeBadge = ({ type }: { type: TicketType | 'Multiple' | string }) => {
    const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
        'booking': { label: 'إصدار', icon: Ticket, className: 'bg-blue-100 text-blue-800' },
        'exchange': { label: 'تغيير', icon: RefreshCw, className: 'bg-yellow-100 text-yellow-800' },
        'refund': { label: 'استرجاع', icon: X, className: 'bg-red-100 text-red-800' },
        'void': { label: 'فويد', icon: X, className: 'bg-gray-100 text-gray-800' },
        'Multiple': { label: 'عمليات متعددة', icon: Layers3, className: 'bg-purple-100 text-purple-800' }
    };

    const typeConfig = config[type];
    if (!typeConfig) return <Badge variant="secondary">{type}</Badge>;
    const Icon = typeConfig.icon;

    return (
        <Badge variant="outline" className={cn("gap-1.5", typeConfig.className)}>
            <Icon className="h-3 w-3"/>
            {typeConfig.label}
        </Badge>
    )
}

const PassengerTypeIcon = ({ type, className }: { type: Passenger['passengerType'], className?: string }) => {
    const config = {
        Adult: { icon: UserSquare },
        Child: { icon: UserRound },
        Infant: { icon: Baby }
    }[type];

    if (!config) return null;
    const Icon = config.icon;
    return <Icon className={cn("h-4 w-4", className)} />;
}


const BookingRow = ({ booking, onBookingUpdated, onBookingDeleted, clients, suppliers }: {
    booking: BookingEntry;
    onBookingUpdated: (updatedBooking: BookingEntry) => void;
    onBookingDeleted: (bookingId: string) => void;
    clients: Client[];
    suppliers: Supplier[];
}) => {
    const { toast } = useToast();
    
    if (!booking) {
        return (
            <TableRow>
                <TableCell colSpan={10} className="text-center text-destructive">
                    بيانات الحجز الأصلية مفقودة لهذا السجل.
                </TableCell>
            </TableRow>
        );
    }
    
    const handleDelete = async () => {
        const result = await softDeleteBooking(booking.id);
        if (result.success) {
            toast({ title: "تم نقل الحجز إلى سجل المحذوفات" });
            onBookingDeleted(booking.id);
        } else {
             toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

    const currency = booking.currency || "USD";
    const { totalSale, totalPurchase, totalProfit, supplierId, clientId, pnr, route, passengers } = useMemo(() => {
        let sale = (booking.passengers || []).reduce((sum: number, p: any) => sum + (p.salePrice || 0), 0);
        let purchase = (booking.passengers || []).reduce((sum: number, p: any) => sum + (p.purchasePrice || 0), 0);
        
        return {
            totalSale: sale,
            totalPurchase: purchase,
            totalProfit: sale - purchase,
            supplierId: booking.supplierId,
            clientId: booking.clientId,
            pnr: booking.pnr || booking.id.slice(-6),
            route: booking.route,
            passengers: booking.passengers || []
        };
    }, [booking]);

    const supplierName = suppliers.find(s => s.id === supplierId)?.name || supplierId;
    const clientName = clients.find(c => c.id === clientId)?.name || clientId;
    
    const operationType: TicketType | 'Multiple' | string = useMemo(() => {
        return 'booking'; // Simplified for now
    }, []);

    return (
       <React.Fragment>
            <TableRow className="font-bold text-center">
                <TableCell className="border p-2 align-middle"><CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:rotate-180"><ChevronDown className="h-4 w-4" /></Button></CollapsibleTrigger></TableCell>
                <TableCell className="border p-2 align-middle"><div className="font-mono text-xs">{booking.invoiceNumber}</div><div className="text-xs text-muted-foreground">{booking.issueDate ? format(parseISO(booking.issueDate), 'yyyy-MM-dd') : '-'}</div></TableCell>
                <TableCell className="border p-2 align-middle"><div className="font-mono font-semibold">{pnr}</div><div className="text-xs text-muted-foreground">{route}</div></TableCell>
                <TableCell className="border p-2 align-middle">
                    <Sheet>
                        <SheetTrigger asChild><Button variant="link" className="p-0 h-auto font-bold"><div className="flex items-center gap-2">{booking.airlineLogoUrl && <Image src={booking.airlineLogoUrl} alt="" width={24} height={24} className="rounded-full" />}<div className="font-semibold">{(passengers || []).length} مسافر</div></div></Button></SheetTrigger>
                        <SheetContent>
                            <SheetHeader><SheetTitle>المسافرون في حجز: {pnr}</SheetTitle><SheetDescription>تفاصيل المسافرين والبيانات المالية لكل منهم.</SheetDescription></SheetHeader>
                            <div className="space-y-3 mt-4">
                                {(passengers || []).map((p: Passenger, index: number) => (
                                    <Card key={p.id || index}>
                                        <CardHeader className="p-3"><CardTitle className="text-base">{p.name}</CardTitle><CardDescription>تذكرة: {p.ticketNumber} | جواز: {p.passportNumber || 'N/A'}</CardDescription></CardHeader>
                                        <CardContent className="p-3 grid grid-cols-3 gap-2 text-center text-sm">
                                            <div className="bg-red-50 p-2 rounded-md"><p className="text-xs text-muted-foreground">الشراء</p><p className="font-bold font-mono">{formatCurrency(p.purchasePrice, currency)}</p></div>
                                            <div className="bg-green-50 p-2 rounded-md"><p className="text-xs text-muted-foreground">البيع</p><p className="font-bold font-mono">{formatCurrency(p.salePrice, currency)}</p></div>
                                            <div className="bg-blue-50 p-2 rounded-md"><p className="text-xs text-muted-foreground">الربح</p><p className={cn("font-bold font-mono", (p.salePrice - p.purchasePrice) < 0 ? 'text-destructive' : '')}>{formatCurrency(p.salePrice - p.purchasePrice, currency)}</p></div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>
                </TableCell>
                <TableCell className="border p-2 align-middle"><OperationTypeBadge type={operationType} /></TableCell>
                <TableCell className="border p-2 align-middle"><div className="font-semibold">{supplierName}</div><PriceDisplay title={`إجمالي التكلفة (${currency})`} amount={totalPurchase} currency={currency} icon={ArrowDown} colorClass="text-red-500" /></TableCell>
                <TableCell className="border p-2 align-middle"><div className="font-semibold">{clientName}</div><PriceDisplay title={`إجمالي المبيع (${currency})`} amount={totalSale} currency={currency} icon={ArrowUp} colorClass="text-green-600" /></TableCell>
                <TableCell className="border p-2 align-middle"><PriceDisplay title="الربح" amount={totalProfit} currency={currency} icon={DollarSign} colorClass="text-blue-600 font-bold" /></TableCell>
                <TableCell className="border p-2 align-middle"><div className="text-xs">{booking.enteredBy}</div>{booking.enteredAt && <div className="text-xs text-muted-foreground">{format(parseISO(booking.enteredAt), 'yyyy-MM-dd')}</div>}</TableCell>
                <TableCell className="border p-2 align-middle">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <BookingDialog 
                                isEditing 
                                booking={booking as BookingEntry} 
                                onBookingUpdated={onBookingUpdated}
                            >
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={operationType !== 'booking'}>
                                    <Edit className="me-2 h-4 w-4" /> تعديل
                                </DropdownMenuItem>
                             </BookingDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="me-2 h-4 w-4"/> حذف</DropdownMenuItem></AlertDialogTrigger>
                                 <AlertDialogContent>
                                    <AlertDialogHeader className="items-center text-center">
                                        <div className="p-3 bg-destructive/10 rounded-full w-fit">
                                            <AlertTriangle className="h-8 w-8 text-destructive" />
                                        </div>
                                        <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            هذا الإجراء سينقل الحجز إلى سجل المحذوفات. يمكنك استعادته لاحقًا.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-row gap-2 justify-end">
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، قم بالحذف</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
            <CollapsibleContent asChild>
                <TableRow>
                    <TableCell colSpan={10} className="p-0">
                        <div className="p-4 bg-muted/50">
                            <h4 className="font-bold mb-2">تفاصيل المسافرين:</h4>
                             <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-background">
                                        <TableHead className="font-semibold">اسم المسافر</TableHead>
                                        <TableHead className="font-semibold">رقم الجواز</TableHead>
                                        <TableHead className="font-semibold">رقم التذكرة</TableHead>
                                        <TableHead className="font-semibold">نوع المسافر</TableHead>
                                        <TableHead className="font-semibold">نوع التذكرة</TableHead>
                                        <TableHead className="text-center font-semibold">شراء</TableHead>
                                        <TableHead className="text-center font-semibold">بيع</TableHead>
                                        <TableHead className="text-center font-semibold">ربح</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(passengers || []).map((p: Passenger, i: number) => {
                                        const profit = p.salePrice - p.purchasePrice;
                                        return (
                                        <TableRow key={p.id || i}>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell className="font-mono">{p.passportNumber || '-'}</TableCell>
                                            <TableCell className="font-mono">{p.ticketNumber}</TableCell>
                                            <TableCell><div className="flex items-center gap-2"><PassengerTypeIcon type={p.passengerType} /> {p.passengerType}</div></TableCell>
                                            <TableCell><OperationTypeBadge type={p.ticketType || 'Issue'} /></TableCell>
                                            <TableCell className="text-center font-mono">{formatCurrency(p.purchasePrice, currency)}</TableCell>
                                            <TableCell className="text-center font-mono">{formatCurrency(p.salePrice, currency)}</TableCell>
                                            <TableCell className={cn("text-center font-mono font-bold", profit >= 0 ? "text-green-600" : "text-destructive")}>{formatCurrency(profit, currency)}</TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            </CollapsibleContent>
        </React.Fragment>
    );
};


export default function BookingsTable({ bookings, totalBookings, onBookingUpdated, onBookingDeleted }: BookingsTableProps) {
  
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
    
  if(!isDataLoaded) {
    return <div className="text-center p-8">جاري تحميل البيانات...</div>
  }
  
  const columns = React.useMemo(() => [], []);

  const table = useReactTable({
        data: bookings,
        columns,
        manualPagination: true,
        pageCount: Math.ceil(totalBookings / 15),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
  });


  return (
    <div className="space-y-4">
    <div className="border rounded-lg overflow-x-auto">
      <Table className="border-collapse">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] border p-2"></TableHead>
            <TableHead className="border p-2 text-center font-bold">الفاتورة / التاريخ</TableHead>
            <TableHead className="border p-2 text-center font-bold">PNR / المسار</TableHead>
            <TableHead className="border p-2 text-center font-bold">المسافرون</TableHead>
            <TableHead className="border p-2 text-center font-bold">نوع العملية</TableHead>
            <TableHead className="border p-2 text-center font-bold">المصدر / التكلفة</TableHead>
            <TableHead className="border p-2 text-center font-bold">المستفيد / المبيع</TableHead>
            <TableHead className="border p-2 text-center font-bold">الربح</TableHead>
            <TableHead className="border p-2 text-center font-bold">مدخل البيانات/التاريخ</TableHead>
            <TableHead className="text-center font-bold border p-2">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center border p-2">
                  لا توجد حجوزات لعرضها.
              </TableCell>
            </TableRow>
          ) : bookings.map((booking, index) => (
              <Collapsible asChild key={booking.id || index}>
                <BookingRow 
                    booking={booking} 
                    onBookingUpdated={onBookingUpdated}
                    onBookingDeleted={onBookingDeleted}
                    clients={navData.clients || []}
                    suppliers={navData.suppliers || []}
                />
              </Collapsible>
          ))}
        </TableBody>
      </Table>
    </div>
    <DataTablePagination table={table} totalRows={totalBookings} />
    </div>
  );
}

    
