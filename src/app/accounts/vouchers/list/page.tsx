'use client';

import * as React from 'react';
import type {
  Voucher,
  Client,
  Supplier,
  Box,
  User,
  AppSettings,
  VoucherListSettings,
  Exchange,
} from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  PlusCircle,
  FileText,
  Search,
  Filter,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import VouchersTable from './components/vouchers-table';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { getAllVouchers, deleteVoucher } from './actions';
import { getClients } from '@/app/relations/actions';
import { getUsers } from '@/app/users/actions';
import { getBoxes } from '@/app/boxes/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { getSettings, updateSettings } from '@/app/settings/actions';
import VouchersListSettingsDialog from './components/vouchers-list-settings-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getExchanges } from '@/app/exchanges/actions';


const VouchersListContent = () => {
  const { toast } = useToast();
  const [vouchers, setVouchers] = React.useState<Voucher[]>([]);
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [voucherListSettings, setVoucherListSettings] =
    React.useState<VoucherListSettings | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState('all');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [
        clientsRes,
        usersData,
        boxesData,
        suppliersData,
        settingsData,
        exchangesRes,
      ] = await Promise.allSettled([
        getClients({ all: true }),
        getUsers(),
        getBoxes(),
        getSuppliers({ all: true }),
        getSettings(),
        getExchanges(),
      ]);

      if (clientsRes.status !== 'fulfilled' || !clientsRes.value?.clients)
        throw new Error('فشل تحميل العملاء');
      if (usersData.status !== 'fulfilled')
        throw new Error('فشل تحميل المستخدمين');
      if (boxesData.status !== 'fulfilled')
        throw new Error('فشل تحميل الصناديق');
      if (suppliersData.status !== 'fulfilled')
        throw new Error('فشل تحميل الموردين');
      if (settingsData.status !== 'fulfilled' || !settingsData.value)
        throw new Error('فشل تحميل الإعدادات');
      if(exchangesRes.status !== 'fulfilled' || exchangesRes.value.error || !exchangesRes.value.accounts)
        throw new Error(exchangesRes.value?.error || 'فشل تحميل البورصات');

      const allRelations = clientsRes.value.clients;
      const fetchedClients = allRelations.filter(
        (r: any) => r.relationType === 'client' || r.relationType === 'both'
      );

      const settings = settingsData.value;
      setSettings(settings);
      setVoucherListSettings(settings.voucherSettings?.listSettings);

      const vouchersData = await getAllVouchers(
        fetchedClients,
        suppliersData.value,
        boxesData.value,
        usersData.value,
        settings
      );

      setVouchers(vouchersData || []);
    } catch (error: any) {
      console.error('خطأ في تحميل السندات:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحميل البيانات.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSettingsChanged = async (newSettings: VoucherListSettings) => {
    if (!settings) return;
    const result = await updateSettings({
      voucherSettings: { ...settings.voucherSettings, listSettings: newSettings },
    });
    if (result.success) {
      setVoucherListSettings(newSettings);
      toast({ title: 'تم تحديث إعدادات العرض' });
      fetchData();
    } else {
      toast({
        title: 'خطأ',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const filteredVouchers = React.useMemo(() => {
    return vouchers.filter((v) => {
      const typeMatch = filterType === 'all' || v.voucherType === filterType;
      const searchMatch = debouncedSearchTerm
        ? v.invoiceNumber
            ?.toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase()) ||
          v.companyName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          v.officer?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          v.notes?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
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
    );
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
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="journal_from_standard_receipt">
                سند قبض عادي
              </SelectItem>
              <SelectItem value="journal_from_distributed_receipt">
                سند قبض مخصص
              </SelectItem>
              <SelectItem value="journal_from_payment">سند دفع</SelectItem>
              <SelectItem value="journal_from_expense">سند مصاريف</SelectItem>
              <SelectItem value="journal_voucher">قيد محاسبي</SelectItem>
              <SelectItem value="booking">حجز طيران</SelectItem>
              <SelectItem value="visa">طلب فيزا</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchData()}
            variant="outline"
            size="icon"
            className="h-8 w-8"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>

          <VouchersListSettingsDialog
            settings={voucherListSettings}
            onSettingsChanged={handleSettingsChanged}
          />
        </div>
      </CardHeader>

      <CardContent>
        {filteredVouchers.length > 0 ? (
          <VouchersTable
            vouchers={filteredVouchers}
            onDataChanged={fetchData}
            settings={voucherListSettings}
          />
        ) : (
          <div className="py-10 text-center text-muted-foreground">
            لا توجد سندات مطابقة للبحث أو الفلاتر المحددة.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function VouchersListPage() {
  return (
    <div className="space-y-6">
      <CardHeader className="px-0 sm:px-6">
        <CardTitle>📑 سجل السندات الموحد</CardTitle>
        <CardDescription>
          عرض جميع السندات والحركات المالية في النظام مع إمكانية الفلترة والبحث.
        </CardDescription>
      </CardHeader>
      <VouchersListContent />
    </div>
  );
}
