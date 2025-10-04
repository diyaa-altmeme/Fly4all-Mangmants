

"use client";

import * as React from 'react';
import type { Voucher, Client, Supplier, Box, User, AppSettings, VoucherListSettings } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, FileText, Search, Filter } from "lucide-react";
import VouchersTable from './components/vouchers-table';
import NewStandardReceiptDialog from '@/app/accounts/vouchers/components/new-standard-receipt-dialog';
import NewPaymentVoucherDialog from '@/app/accounts/vouchers/components/new-payment-voucher-dialog';
import NewExpenseVoucherDialog from '@/app/accounts/vouchers/components/new-expense-voucher-dialog';
import NewJournalVoucherDialog from '@/app/accounts/vouchers/components/new-journal-voucher-dialog';
import NewDistributedReceiptDialog from '@/app/accounts/vouchers/components/new-distributed-receipt-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import VouchersListSettingsDialog from './components/vouchers-list-settings-dialog';
import { updateSettings } from '@/app/settings/actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';

const VouchersListContent = ({ initialVouchers, settings, clients, suppliers, users, boxes }: { 
    initialVouchers: Voucher[];
    settings: AppSettings;
    clients: Client[];
    suppliers: Supplier[];
    users: User[];
    boxes: Box[];
}) => {
    const router = useRouter();
    const { toast } = useToast();
    const [vouchers, setVouchers] = React.useState(initialVouchers);
    const [voucherListSettings, setVoucherListSettings] = React.useState<VoucherListSettings>(settings.voucherSettings?.listSettings || { columns: [], detailsMode: 'inline' });
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterType, setFilterType] = React.useState('all');
    
    React.useEffect(() => {
        setVouchers(initialVouchers);
    }, [initialVouchers]);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const onDataChanged = () => {
        router.refresh();
    };

    const handleSettingsChanged = async (newSettings: VoucherListSettings) => {
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

    return (
        <Card>
            <CardHeader className="flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle>سجل السندات الموحد</CardTitle>
                    <CardDescription>
                        عرض جميع السندات والحركات المالية في النظام مع إمكانية الفلترة والبحث.
                    </CardDescription>
                </div>
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
                    <VouchersListSettingsDialog settings={voucherListSettings} onSettingsChanged={handleSettingsChanged}/>
                </div>
            </CardHeader>
            <CardContent>
                 <VouchersTable
                    vouchers={filteredVouchers}
                    onDataChanged={onDataChanged}
                    settings={voucherListSettings}
                />
            </CardContent>
        </Card>
    );
};

export default VouchersListContent;

