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
  Search,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import VouchersTable from './components/vouchers-table';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { getAllVouchers } from './actions';
import { updateSettings } from '@/app/settings/actions';
import VouchersListSettingsDialog from './components/vouchers-list-settings-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_VOUCHER_TABS_ORDER, getVoucherTypeLabel } from '@/lib/accounting/voucher-types';
import type { NormalizedVoucherType } from '@/lib/accounting/voucher-types';


const VouchersListContent = () => {
  const { toast } = useToast();
  const [vouchers, setVouchers] = React.useState<Voucher[]>([]);
  const {data: navData, loaded: isDataLoaded, fetchData} = useVoucherNav();
  const [loading, setLoading] = React.useState(true);
  
  const [voucherListSettings, setVoucherListSettings] =
    React.useState<VoucherListSettings | undefined>();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | NormalizedVoucherType>('all');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchVouchers = React.useCallback(async () => {
    if (!isDataLoaded || !navData) return;
    setLoading(true);
    try {
        const vouchersData = await getAllVouchers(
            navData.clients,
            navData.suppliers,
            navData.boxes,
            navData.users,
            navData.settings
        );
         setVouchers(vouchersData || []);

    } catch (error: any) {
         toast({
            title: 'خطأ',
            description: error.message || 'فشل في تحميل البيانات.',
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  }, [isDataLoaded, navData, toast]);

  React.useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);
  
  React.useEffect(() => {
      if(navData?.settings?.voucherSettings?.listSettings) {
          setVoucherListSettings(navData.settings.voucherSettings.listSettings);
      }
  }, [navData]);

  const handleSettingsChanged = async (newSettings: VoucherListSettings) => {
    if (!navData?.settings) return;
    const result = await updateSettings({
      voucherSettings: { ...navData.settings.voucherSettings, listSettings: newSettings },
    });
    if (result.success) {
      setVoucherListSettings(newSettings);
      toast({ title: 'تم تحديث إعدادات العرض' });
      fetchData(); // Refetch all context data
    } else {
      toast({
        title: 'خطأ',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const searchedVouchers = React.useMemo(() => {
    return vouchers.filter((v) => {
      if (!debouncedSearchTerm) return true;
      const term = debouncedSearchTerm.toLowerCase();
      return (
        v.invoiceNumber?.toLowerCase().includes(term) ||
        v.companyName?.toLowerCase().includes(term) ||
        v.officer?.toLowerCase().includes(term) ||
        v.notes?.toLowerCase().includes(term)
      );
    });
  }, [vouchers, debouncedSearchTerm]);

  const tabData = React.useMemo(() => {
    const map = new Map<string, Voucher[]>();
    map.set('all', searchedVouchers);
    searchedVouchers.forEach((voucher) => {
      const key = voucher.normalizedType || 'other';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(voucher);
    });
    return map;
  }, [searchedVouchers]);

  const tabDefinitions = React.useMemo(() => {
    const counts = new Map<string, number>();
    counts.set('all', searchedVouchers.length);
    searchedVouchers.forEach((voucher) => {
      const key = voucher.normalizedType || 'other';
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const presentTypes = Array.from(counts.keys()).filter((key) => key !== 'all') as NormalizedVoucherType[];
    const ordered = [
      ...DEFAULT_VOUCHER_TABS_ORDER.filter((type) => presentTypes.includes(type) && counts.get(type) !== undefined),
      ...presentTypes.filter((type) => !DEFAULT_VOUCHER_TABS_ORDER.includes(type)),
    ];

    return [
      { id: 'all' as const, label: 'كل السندات', count: counts.get('all') || 0 },
      ...ordered.map((type) => ({
        id: type,
        label: getVoucherTypeLabel(type),
        count: counts.get(type) || 0,
      })),
    ];
  }, [searchedVouchers]);

  React.useEffect(() => {
    if (activeTab !== 'all' && !tabData.has(activeTab)) {
      setActiveTab('all');
    }
  }, [activeTab, tabData]);

  if (loading || !isDataLoaded || !voucherListSettings) {
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
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في السندات..."
            className="ps-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchVouchers()}
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="تحديث البيانات"
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
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'all' | NormalizedVoucherType)}
          className="space-y-4"
        >
          <TabsList className="w-full overflow-x-auto flex gap-2">
            {tabDefinitions.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <span>{tab.label}</span>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {tab.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabDefinitions.map((tab) => {
            const vouchersForTab = tab.id === 'all'
              ? tabData.get('all') || []
              : tabData.get(tab.id as string) || [];
            return (
              <TabsContent key={tab.id} value={tab.id} className="mt-4">
                {vouchersForTab.length > 0 ? (
                  <VouchersTable
                    vouchers={vouchersForTab}
                    onDataChanged={fetchVouchers}
                    settings={voucherListSettings}
                  />
                ) : (
                  <div className="py-10 text-center text-muted-foreground">
                    لا توجد سندات ضمن هذا التصنيف بناءً على معايير البحث الحالية.
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
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
