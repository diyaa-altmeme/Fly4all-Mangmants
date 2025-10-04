
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Briefcase, Building, CheckCircle, CircleDollarSign, DollarSign, Edit, FileText, Ticket, User, Calendar, CircleUserRound } from 'lucide-react';
import type { Client, ReportTransaction, ClientTransactionSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from '@/app/users/components/users-table';
import { getColumns, TransactionCard } from './transactions-table-columns';
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import { useAuth } from '@/context/auth-context';
import { format, parseISO } from 'date-fns';
import ChangeAvatarDialog from './change-avatar-dialog';


const StatCard = ({ title, value, icon: Icon, colorClass, subValue }: { title: string, value: string, icon: React.ElementType, colorClass?: string, subValue?: string }) => (
    <div className={cn("p-4 rounded-lg flex items-center gap-4 bg-muted/50", colorClass)}>
        <div className="p-3 bg-background/50 rounded-full">
            <Icon className="h-6 w-6" />
        </div>
        <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        </div>
    </div>
);


const ClientHeader = ({ client, onUpdate }: { client: Client, onUpdate: () => void }) => {
    const { user } = useAuth();
    const isClient = user && !('role' in user);

    const Icon = client.type === 'company' ? (client.relationType === 'supplier' ? Building : Briefcase) : User;
    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                 <ChangeAvatarDialog client={client} onAvatarChanged={onUpdate}>
                    <Avatar className="h-24 w-24 border-4 shrink-0 shadow-md cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={client.avatarUrl} alt={client.name} />
                        <AvatarFallback className="text-3xl"><CircleUserRound className="h-16 w-16 text-muted-foreground"/></AvatarFallback>
                    </Avatar>
                </ChangeAvatarDialog>
                <div className="flex-grow w-full text-center sm:text-right">
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2">
                        <div className='w-full'>
                            <CardTitle className="text-2xl md:text-3xl">{client.name}</CardTitle>
                            <CardDescription className="mt-1 flex gap-2 justify-center sm:justify-start">
                                <Badge variant="outline"><Icon className="me-1.5 h-3 w-3" />{client.relationType === 'supplier' ? 'مورد' : 'عميل'} ({client.type === 'company' ? 'شركة' : 'فرد'})</Badge>
                                {client.code && <Badge variant="secondary">المعرف: {client.code}</Badge>}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2 self-center sm:self-start mt-2 sm:mt-0 w-full sm:w-auto">
                           {!isClient && (
                               <AddClientDialog isEditing initialData={client} onClientUpdated={onUpdate}>
                                <Button variant="outline" className='w-full'>
                                    <Edit className="me-2 h-4 w-4" />
                                    تعديل
                                </Button>
                                </AddClientDialog>
                           )}
                             <Button asChild className="w-full">
                                <Link href={`/reports/account-statement?accountId=${client.id}`}>
                                    عرض كشف الحساب <ArrowLeft className="ms-2 h-4 w-4"/>
                                </Link>
                            </Button>
                        </div>
                    </div>
                     <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
                        {client.createdAt && <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> انضم في: {format(parseISO(client.createdAt), 'yyyy-MM-dd')}</span>}
                        {client.createdBy && <span className="flex items-center gap-2"><User className="h-4 w-4" /> أضيف بواسطة: {client.createdBy}</span>}
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
}

const TransactionsTabs = ({ transactions }: { transactions: ReportTransaction[] }) => {
    
    const bookings = transactions.filter(t => t.type === 'حجز طيران' || t.type === 'طلب فيزا');
    const vouchers = transactions.filter(t => t.type !== 'حجز طيران' && t.type !== 'طلب فيزا');
    
    const bookingColumns = getColumns(['date', 'type', 'description', 'debit', 'credit']);
    const voucherColumns = getColumns(['date', 'invoiceNumber', 'description', 'debit', 'credit']);

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle>سجل المعاملات</CardTitle>
                    <CardDescription>آخر الحركات المالية المتعلقة بحسابك.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="bookings">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="bookings"><Ticket className="me-2 h-4 w-4"/>الحجوزات والطلبات</TabsTrigger>
                        <TabsTrigger value="vouchers"><FileText className="me-2 h-4 w-4"/>السندات المالية</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bookings" className="mt-4">
                        {/* Mobile View */}
                        <div className="md:hidden space-y-3">
                            {bookings.map(tx => <TransactionCard key={tx.id} transaction={tx} />)}
                            {bookings.length === 0 && <p className="text-center text-muted-foreground p-8">لا توجد حجوزات</p>}
                        </div>
                         {/* Desktop View */}
                        <div className="hidden md:block">
                            <DataTable columns={bookingColumns} data={bookings} />
                        </div>
                    </TabsContent>
                    <TabsContent value="vouchers" className="mt-4">
                         {/* Mobile View */}
                        <div className="md:hidden space-y-3">
                            {vouchers.map(tx => <TransactionCard key={tx.id} transaction={tx} />)}
                             {vouchers.length === 0 && <p className="text-center text-muted-foreground p-8">لا توجد سندات</p>}
                        </div>
                        {/* Desktop View */}
                        <div className="hidden md:block">
                            <DataTable columns={voucherColumns} data={vouchers} />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

export default function ClientProfileContent({ client, transactions, onUpdate }: { client: Client, transactions: ClientTransactionSummary, onUpdate: () => void }) {
    
    return (
        <div className="space-y-6">
            <ClientHeader client={client} onUpdate={onUpdate} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="إجمالي المبيعات" value={`${transactions.totalSales.toLocaleString()} ${transactions.currency}`} icon={Ticket} colorClass="bg-blue-100 text-blue-600" />
                <StatCard title="المبلغ المدفوع" value={`${transactions.paidAmount.toLocaleString()} ${transactions.currency}`} icon={CheckCircle} colorClass="bg-green-100 text-green-600" />
                <StatCard title="الرصيد المتبقي" value={`${transactions.dueAmount.toLocaleString()} ${transactions.currency}`} icon={CircleDollarSign} colorClass="bg-yellow-100 text-yellow-600" />
                <StatCard title="صافي الربح" value={`${transactions.totalProfit.toLocaleString()} ${transactions.currency}`} icon={DollarSign} colorClass="bg-purple-100 text-purple-600" />
            </div>

            <TransactionsTabs transactions={transactions.transactions} />
        </div>
    );
}
