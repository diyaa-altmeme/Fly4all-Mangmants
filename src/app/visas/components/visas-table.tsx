

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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const VisaRow = ({ booking, suppliers, clients, onBookingUpdated, onBookingDeleted }: { booking: VisaBookingEntry, suppliers: Supplier[], clients: Client[], onBookingUpdated: (booking: VisaBookingEntry) => void, onBookingDeleted: (id: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        const result = await softDeleteVisaBooking(booking.id);
        if (result.success) {
            toast({ title: "تم نقل الطلب إلى سجل المحذوفات" });
            onBookingDeleted(booking.id);
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };
    
    const supplierName = suppliers.find(s => s.id === booking.supplierId)?.name || 'غير محدد';
    const clientName = clients.find(c => c.id === booking.clientId)?.name || 'غير محدد';
    const totalPurchase = booking.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalSale = booking.passengers.reduce((sum, p) => sum + p.salePrice, 0);
    const profit = totalSale - totalPurchase;

    return (
        <React.Fragment>
            <TableRow>
                <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    </Button>
                </TableCell>
                <TableCell className="font-medium text-center whitespace-nowrap">{booking.invoiceNumber}</TableCell>
                <TableCell className="text-center whitespace-nowrap">{supplierName}</TableCell>
                <TableCell className="text-center whitespace-nowrap">{clientName}</TableCell>
                <TableCell className="font-mono text-center whitespace-nowrap">{totalPurchase.toLocaleString()} {booking.currency}</TableCell>
                <TableCell className="font-mono text-center whitespace-nowrap">{totalSale.toLocaleString()} {booking.currency}</TableCell>
                <TableCell className={cn("font-mono text-center font-bold whitespace-nowrap", profit >= 0 ? "text-green-600" : "text-red-600")}>{profit.toLocaleString()} {booking.currency}</TableCell>
                <TableCell className="text-center space-x-1 rtl:space-x-reverse whitespace-nowrap">
                    <EditVisaDialog booking={booking} onBookingUpdated={onBookingUpdated} />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
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
                                <AlertDialogAction onClick={() => handleDelete(booking.id)} variant="destructive">
                                    نعم، احذف
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
            </TableRow>
            {isOpen && (
                 <TableRow>
                    <TableCell colSpan={8} className="p-0">
                        <div className="p-4 bg-muted/50">
                            <h4 className="font-bold mb-2">تفاصيل المسافرين:</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الاسم</TableHead>
                                        <TableHead>رقم الجواز</TableHead>
                                        <TableHead>نوع الفيزا</TableHead>
                                        <TableHead className="text-right">شراء</TableHead>
                                        <TableHead className="text-right">بيع</TableHead>
                                        <TableHead className="text-right">ربح</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {booking.passengers.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>{p.name}</TableCell>
                                            <TableCell>{p.passportNumber}</TableCell>
                                            <TableCell>{p.visaType}</TableCell>
                                            <TableCell className="text-right">{p.purchasePrice.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{p.salePrice.toLocaleString()}</TableCell>
                                            <TableCell className={cn("text-right font-bold", p.salePrice - p.purchasePrice >= 0 ? "text-green-600" : "text-red-600")}>{(p.salePrice - p.purchasePrice).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

interface VisasTableProps {
  bookings: VisaBookingEntry[];
  clients: Client[];
  suppliers: Supplier[];
  boxes: Box[];
  onBookingDeleted: (bookingId: string) => void;
  onBookingUpdated: (booking: VisaBookingEntry) => void;
}


export default function VisasTable({ bookings, clients, suppliers, boxes, onBookingDeleted, onBookingUpdated }: VisasTableProps) {
    return (
        <div className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="text-center font-bold">رقم الفاتورة</TableHead>
                        <TableHead className="text-center font-bold">الجهة المصدرة</TableHead>
                        <TableHead className="text-center font-bold">الجهة المستفيدة</TableHead>
                        <TableHead className="text-center font-bold">إجمالي الشراء</TableHead>
                        <TableHead className="text-center font-bold">إجمالي البيع</TableHead>
                        <TableHead className="text-center font-bold">الربح</TableHead>
                        <TableHead className="text-center font-bold">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bookings.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">لا توجد سجلات لعرضها.</TableCell>
                        </TableRow>
                    ) : bookings.map((booking) => (
                        <VisaRow 
                            key={booking.id}
                            booking={booking} 
                            suppliers={suppliers} 
                            clients={clients} 
                            onBookingUpdated={onBookingUpdated}
                            onBookingDeleted={onBookingDeleted}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

