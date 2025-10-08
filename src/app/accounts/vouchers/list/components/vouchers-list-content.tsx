


"use client";

import * as React from 'react';
import type { Voucher, Client, Supplier, Box, User, AppSettings, VoucherListSettings } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, FileText, Search, Filter, Loader2, RefreshCw } from "lucide-react";
import VouchersTable from './vouchers-table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import VouchersListSettingsDialog from './vouchers-list-settings-dialog';
import { updateSettings, getSettings } from '@/app/settings/actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { getAllVouchers } from '../actions';
import { getClients } from '@/app/relations/actions';
import { getUsers } from '@/app/users/actions';
import { getBoxes } from '@/app/boxes/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { Skeleton } from '@/components/ui/skeleton';

const VouchersListContent = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [vouchers, setVouchers] = React.useState<Voucher[]>([]);
    const [settings, setSettings] = React.useState<AppSettings | null>(null);
    const [clients, setClients] = React.useState<Client[]>([]);
    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
    const [users, setUsers] = React.useState<User[]>([]);
    const [boxes, setBoxes] = React.useState<Box[]>([]);
    const [loading, setLoading] = React.useState(true);

    const [voucherListSettings, setVoucherListSettings] = React.useState<VoucherListSettings | undefined>(undefined);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterType, setFilterType] = React.useState('all');
    
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [clientsRes, usersData, boxesData, settingsData] = await Promise.all([
                getClients({ all: true }),
                getUsers(),
                getBoxes(),
                getSettings(),
            ]);
            
            const allRelations = clientsRes.clients;
            const fetchedClients = allRelations.filter(r => r.relationType === 'client' || r.relationType === 'both');
            const fetchedSuppliers = allRelations.filter(r => r.relationType === 'supplier' || r.relationType === 'both');

            setClients(fetchedClients);
            setSuppliers(fetchedSuppliers);
            setUsers(usersData);
            setBoxes(boxesData);
            setSettings(settingsData);
            setVoucherListSettings(settingsData.voucherSettings?.listSettings);

            const vouchersData = await getAllVouchers(fetchedClients, fetchedSuppliers, boxesData, usersData, settingsData);
            setVouchers(vouchersData);

        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ title: 'خطأ', description: 'فشل في تحميل البيانات.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSettingsChanged = async (newSettings: VoucherListSettings) => {
        if (!settings) return;
        const result = await updateSettings({ voucherSettings: { ...settings.voucherSettings, listSettings: newSettings } });
        if(result.success) {
            setVoucherListSettings(newSettings);
            toast({ title: 'تم تحديث إعدادات العرض' });
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };

    const filteredVouchers = React.useMemo(() => {
        return vouchers.filter(v => {
            const typeMatch = filterType === 'all' || v.voucherType === filterType;
            const searchMatch = debouncedSearchTerm ?
                (v.invoiceNumber?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                (v.companyName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                (v.officer?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                (v.notes?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
                : true;
            return typeMatch && searchMatch;
        });
    }, [vouchers, debouncedSearchTerm, filterType]);

    if (loading || !settings || !voucherListSettings) {
        return (
            <Card>
                <CardHeader className="flex-col md:flex-row items-start md:items-center justify-between gap-4">
                     <Skeleton className="h-10 w-48" />
                     <Skeleton className="h-10 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <div className="flex items-center gap-2">
                     <div className="relative w-full sm:w-64">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث..."
                            className="ps-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل الأنواع</SelectItem>
                            <SelectItem value="journal_from_standard_receipt">سند قبض عادي</SelectItem>
                            <SelectItem value="journal_from_distributed_receipt">سند قبض مخصص</SelectItem>
                            <SelectItem value="journal_from_payment">سند دفع</SelectItem>
                            <SelectItem value="journal_from_expense">سند مصاريف</SelectItem>
                            <SelectItem value="journal_voucher">قيد محاسبي</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => fetchData()} variant="outline" size="icon" className="h-8 w-8"><RefreshCw className="h-4 w-4" /></Button>
                    <VouchersListSettingsDialog settings={voucherListSettings} onSettingsChanged={handleSettingsChanged}/>
                </div>
            </CardHeader>
            <CardContent>
                 <VouchersTable
                    vouchers={filteredVouchers}
                    onDataChanged={fetchData}
                    settings={voucherListSettings}
                />
            </CardContent>
        </Card>
    );
};

export default VouchersListContent;

    