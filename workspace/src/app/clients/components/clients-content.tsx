

"use client";

import * as React from 'react';
import type { Client, RelationSection, CompanyPaymentType } from '@/lib/types';
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import ClientsTable from './clients-table';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Download, X, Trash2, Loader2, Filter, Settings, PlusCircle, Check } from 'lucide-react';
import ClientCard from './client-card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, getFacetedRowModel, getFacetedUniqueValues, getSortedRowModel, type ColumnFiltersState } from '@tanstack/react-table';
import { getColumns } from './clients-table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { COUNTRIES_DATA } from '@/lib/countries-data';
import { Separator } from '@/components/ui/separator';
import { produce } from 'immer';


interface ClientsContentProps {
    initialRelations: Client[];
    totalRelations: number;
    relationSections: RelationSection[];
}

export default function ClientsContent({ initialRelations, totalRelations, relationSections }: ClientsContentProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [relations, setRelations] = React.useState(initialRelations);
    const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards');
    const [isApplyingFilters, setIsApplyingFilters] = React.useState(false);
    
    // Staged filters are what the user selects in the popover
    const [stagedFilters, setStagedFilters] = React.useState({
        search: searchParams.get('search') || '',
        relationType: searchParams.get('relationType') || 'all',
        paymentType: searchParams.get('paymentType') || 'all',
        status: searchParams.get('status') || 'all',
        country: searchParams.get('country') || 'all',
        province: searchParams.get('province') || 'all',
    });
    
    React.useEffect(() => {
        setRelations(initialRelations);
    }, [initialRelations]);

    const onDataChanged = (updatedClient?: Client, deletedId?: string) => {
        if (updatedClient) {
             setRelations(produce(draft => {
                const index = draft.findIndex(r => r.id === updatedClient.id);
                if (index !== -1) draft[index] = updatedClient;
                else draft.unshift(updatedClient);
            }));
        } else if (deletedId) {
            setRelations(produce(draft => {
                return draft.filter(r => r.id !== deletedId);
            }));
        } else {
             router.refresh(); // Fallback to refresh if no specific action
        }
    };

    const handleApplyFilters = () => {
        setIsApplyingFilters(true);
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(stagedFilters).forEach(([key, value]) => {
            if (value && value !== 'all') {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };
    
    React.useEffect(() => {
        setIsApplyingFilters(false);
    }, [initialRelations]);
    
    const columns = React.useMemo(() => getColumns(relationSections, onDataChanged), [relationSections, onDataChanged]);

    const pageCount = Math.ceil(totalRelations / (Number(searchParams.get('limit')) || 15));

    const table = useReactTable({
        data: relations,
        columns,
        pageCount,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: true,
        manualFiltering: true,
    });
    
    const activeFilterCount = Object.values(stagedFilters).filter(v => v && v !== 'all' && v !== '').length;
    
    return (
        <Card>
            <CardHeader>
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>إدارة العلاقات</CardTitle>
                        <CardDescription>
                            إدارة جميع العملاء والموردين في مكان واحد.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                         <AddClientDialog onClientAdded={(c) => onDataChanged(c)} onClientUpdated={onDataChanged}>
                             <Button><PlusCircle className="me-2 h-4 w-4"/> إضافة جديدة</Button>
                         </AddClientDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8">
                                    <Filter className="me-2 h-4 w-4" />
                                    الفلاتر
                                    {activeFilterCount > 0 && <Badge className="ms-2">{activeFilterCount}</Badge>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">الفلاتر المتقدمة</h4>
                                        <p className="text-sm text-muted-foreground">
                                            قم بتصفية النتائج بناءً على المعايير أدناه.
                                        </p>
                                    </div>
                                    <div className="grid gap-4">
                                         <div className="grid grid-cols-3 items-center gap-4"><Label>نوع العلاقة</Label><Select value={stagedFilters.relationType} onValueChange={(v) => setStagedFilters(f => ({...f, relationType: v}))}><SelectTrigger className="col-span-2"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">كل الأنواع</SelectItem><SelectItem value="client">عميل</SelectItem><SelectItem value="supplier">مورد</SelectItem><SelectItem value="both">كلاهما</SelectItem></SelectContent></Select></div>
                                         <div className="grid grid-cols-3 items-center gap-4"><Label>نوع التعامل</Label><Select value={stagedFilters.paymentType} onValueChange={(v) => setStagedFilters(f => ({...f, paymentType: v}))}><SelectTrigger className="col-span-2"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">كل الأنواع</SelectItem><SelectItem value="cash">نقدي</SelectItem><SelectItem value="credit">آجل</SelectItem></SelectContent></Select></div>
                                         <div className="grid grid-cols-3 items-center gap-4"><Label>الحالة</Label><Select value={stagedFilters.status} onValueChange={(v) => setStagedFilters(f => ({...f, status: v}))}><SelectTrigger className="col-span-2"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="active">نشط</SelectItem><SelectItem value="inactive">غير نشط</SelectItem></SelectContent></Select></div>
                                         <Separator />
                                         <div className="grid grid-cols-3 items-center gap-4"><Label>الدولة</Label><Select value={stagedFilters.country} onValueChange={(v) => setStagedFilters(f => ({...f, country: v, province: 'all'}))}><SelectTrigger className="col-span-2"><SelectValue/></SelectTrigger><SelectContent>{[{name: 'all'},...COUNTRIES_DATA].map(c => <SelectItem key={c.name} value={c.name}>{c.name === 'all' ? 'كل الدول' : c.name}</SelectItem>)}</SelectContent></Select></div>
                                         <div className="grid grid-cols-3 items-center gap-4"><Label>المحافظة</Label><Select value={stagedFilters.province} onValueChange={(v) => setStagedFilters(f => ({...f, province: v}))} disabled={stagedFilters.country === 'all'}><SelectTrigger className="col-span-2"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">كل المحافظات</SelectItem>{(COUNTRIES_DATA.find(c=>c.name === stagedFilters.country)?.provinces || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                                         <Separator />
                                         <Button onClick={handleApplyFilters} disabled={isApplyingFilters}>
                                             {isApplyingFilters && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                                             تطبيق الفلاتر
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                         <div className="relative flex-grow sm:flex-grow-0 sm:w-72">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                           <Input
                               placeholder="بحث بالاسم, الهاتف, المعرف..."
                               value={stagedFilters.search}
                               onChange={(e) => setStagedFilters(f => ({...f, search: e.target.value}))}
                               onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                               className="ps-10 h-8"
                           />
                       </div>
                       {searchParams.toString() !== '' && (
                            <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
                                <X className="me-2 h-4 w-4"/> مسح
                            </Button>
                       )}
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant={viewMode === 'cards' ? 'secondary' : 'outline'} size="sm" onClick={() => setViewMode('cards')}><LayoutGrid className="me-2 h-4 w-4" /> بطاقات</Button>
                        <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} size="sm" onClick={() => setViewMode('table')}><List className="me-2 h-4 w-4" /> جدول</Button>
                    </div>
                </div>
                 
                {isApplyingFilters ? <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                    <>
                    {viewMode === 'table' ? (
                        <ClientsTable
                            table={table}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {relations.map(client => (
                                <ClientCard key={client.id} client={client} relationSections={relationSections} onClientUpdated={onDataChanged} />
                            ))}
                        </div>
                    )}
                    {relations.length === 0 && (
                       <div className="col-span-full text-center p-8 border-2 border-dashed rounded-lg">
                          <p className="text-muted-foreground">لا توجد نتائج تطابق الفلتر.</p>
                       </div>
                    )}
                    <DataTablePagination table={table} totalRows={totalRelations} />
                    </>
                )}
            </CardContent>
        </Card>
    );
}
