

"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { VisaBookingEntry, Client, Supplier, Box, VisaPassenger } from '@/lib/types';
import { ChevronDown, ChevronRight, Edit, Trash2, MoreVertical, ShieldCheck, CheckCircle2, CircleDotDashed, Ticket, User, Building, CreditCard, Banknote, BookUser, Route } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { softDeleteVisaBooking } from '../actions';
import EditVisaDialog from './edit-visa-dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';


interface VisasTableProps {
  bookings: VisaBookingEntry[];
  clients: Client[];
  suppliers: Supplier[];
  boxes: Box[];
  onBookingDeleted: (bookingId: string) => void;
  onBookingUpdated: (booking: VisaBookingEntry) => void;
}


export default function VisasTable({ bookings, clients, suppliers, boxes, onBookingDeleted, onBookingUpdated }: VisasTableProps) {
  
  const { toast } = useToast();
  
    const flattenedData = useMemo(() => {
        return bookings.flatMap(booking => 
            booking.passengers.map(passenger => ({
                ...booking,
                ...passenger,
                bookingId: booking.id, // Keep original booking id
                passengerId: passenger.id, // Keep original passenger id
            }))
        );
    }, [bookings]);
  
  const handleDelete = async (bookingId: string) => {
    const result = await softDeleteVisaBooking(bookingId);
    if(result.success) {
      toast({ title: 'تم نقل الطلب إلى سجل المحذوفات' });
      onBookingDeleted(bookingId);
    } else {
      toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
    }
  }
  
  return (
    <>
    <div className="overflow-x-auto">
      {/* Mobile View */}
       <div className="md:hidden">
        {flattenedData.map((item) => {
            const supplierName = suppliers.find(s => s.id === item.supplierId)?.name || 'غير محدد';
            const clientName = clients.find(c => c.id === item.clientId)?.name || 'غير محدد';
            const profit = item.salePrice - item.purchasePrice;
            const originalBooking = bookings.find(b => b.id === item.bookingId);
             if (!originalBooking) return null;
            return (
                <Card key={`${item.bookingId}-${item.passengerId}`} className="mb-4">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">{item.name}</CardTitle>
                                <CardDescription>فاتورة: {item.invoiceNumber}</CardDescription>
                            </div>
                            <div className="flex items-center gap-1">
                                 <EditVisaDialog 
                                    booking={originalBooking}
                                    onBookingUpdated={onBookingUpdated}
                                 />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                    </AlertDialogTrigger>
                                     <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                هذا الإجراء سينقل الطلب إلى سجل المحذوفات. يمكنك استعادته لاحقًا.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(item.bookingId)} variant="destructive">
                                                نعم، احذف
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">رقم الجواز:</span><span className="font-medium">{item.passportNumber}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">رقم الطلب:</span><span className="font-medium">{item.applicationNumber}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">نوع الفيزا:</span><Badge variant="outline">{item.visaType}</Badge></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">BK:</span><span className="font-medium">{item.bk || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">المورد:</span><span className="font-medium">{supplierName}</span></div>
                         <div className="flex justify-between"><span className="text-muted-foreground">العميل:</span><span className="font-medium">{clientName}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">سعر الشراء:</span><span className="font-mono">{item.purchasePrice.toLocaleString()} {item.currency}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">سعر البيع:</span><span className="font-mono">{item.salePrice.toLocaleString()} {item.currency}</span></div>
                        <div className="flex justify-between font-bold"><span className="text-muted-foreground">الربح:</span><span className={cn(profit >= 0 ? "text-green-600" : "text-red-600")}>{profit.toLocaleString()} {item.currency}</span></div>
                    </CardContent>
                </Card>
            )
        })}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
            <TableHeader>
            <TableRow>
                    <TableHead className="text-center font-bold">رقم الفاتورة</TableHead>
                    <TableHead className="text-center font-bold">الاسم</TableHead>
                    <TableHead className="text-center font-bold">رقم الجواز</TableHead>
                    <TableHead className="text-center font-bold">رقم الطلب</TableHead>
                    <TableHead className="text-center font-bold">نوع الفيزا</TableHead>
                    <TableHead className="text-center font-bold">BK</TableHead>
                    <TableHead className="text-center font-bold">الجهة المصدرة</TableHead>
                    <TableHead className="text-center font-bold">سعر الشراء</TableHead>
                    <TableHead className="text-center font-bold">الجهة المستفيدة</TableHead>
                    <TableHead className="text-center font-bold">سعر البيع</TableHead>
                    <TableHead className="text-center font-bold">الربح</TableHead>
                    <TableHead className="text-center font-bold">الإجراءات</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {flattenedData.map((item) => {
                const supplierName = suppliers.find(s => s.id === item.supplierId)?.name || 'غير محدد';
                const clientName = clients.find(c => c.id === item.clientId)?.name || 'غير محدد';
                const profit = item.salePrice - item.purchasePrice;

                const originalBooking = bookings.find(b => b.id === item.bookingId);
                if (!originalBooking) return null;

                return (
                <React.Fragment key={`${item.bookingId}-${item.passengerId}`}>
                    <TableRow>
                    <TableCell className="font-medium text-center whitespace-nowrap">{item.invoiceNumber}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{item.name}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{item.passportNumber}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{item.applicationNumber}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{item.visaType}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{item.bk}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{supplierName}</TableCell>
                    <TableCell className="font-mono text-center whitespace-nowrap">{item.purchasePrice.toLocaleString()} {item.currency}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{clientName}</TableCell>
                    <TableCell className="font-mono text-center whitespace-nowrap">{item.salePrice.toLocaleString()} {item.currency}</TableCell>
                    <TableCell className={cn("font-mono text-center font-bold whitespace-nowrap", profit >= 0 ? "text-green-600" : "text-red-600")}>{profit.toLocaleString()} {item.currency}</TableCell>
                    <TableCell className="text-center space-x-1 rtl:space-x-reverse whitespace-nowrap">
                        <EditVisaDialog 
                            booking={originalBooking}
                            onBookingUpdated={onBookingUpdated}
                        />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        هذا الإجراء سينقل الطلب إلى سجل المحذوفات. يمكنك استعادته لاحقًا.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(item.bookingId)} variant="destructive">
                                        نعم، احذف
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                </React.Fragment>
                )
            })}
            </TableBody>
        </Table>
      </div>
       {bookings.length === 0 && (
         <div className="text-center p-8 text-muted-foreground">لا يتم عرض اي بينات</div>
      )}
    </div>
    </>
  );
}
