
"use client";

import * as React from 'react';
import type { Supplier, CompanyGroup, WorkType } from '@/lib/types';
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import SuppliersTable from './suppliers-table';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Download, X, Trash2, Loader2, PlusCircle } from 'lucide-react';
import ClientCard from '@/app/clients/components/client-card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { useDebounce } from '@/hooks/use-debounce';
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
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { deleteMultipleSuppliers } from '@/app/suppliers/actions';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface SuppliersContentProps {
    initialSuppliers: Supplier[];
    companyGroups: CompanyGroup[];
    workTypes: WorkType[];
    onDataChanged: () => void;
}

export default function SuppliersContent({ initialSuppliers, companyGroups, workTypes, onDataChanged }: SuppliersContentProps) {
    const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('table');
    const [searchTerm, setSearchTerm] = React.useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    
    const [groupFilter, setGroupFilter] = React.useState<string>('all');
    const [workTypeFilter, setWorkTypeFilter] = React.useState<string>('all');

    const filteredSuppliers = React.useMemo(() => {
        let filtered = initialSuppliers;

        if (debouncedSearchTerm) {
            const lowercasedTerm = debouncedSearchTerm.toLowerCase();
            filtered = filtered.filter(supplier => 
                supplier.name.toLowerCase().includes(lowercasedTerm) ||
                (supplier.phone && supplier.phone.includes(lowercasedTerm))
            );
        }
        
        return filtered.filter(supplier => {
            if (groupFilter !== 'all' && supplier.groupId !== groupFilter) return false;
            if (workTypeFilter !== 'all' && supplier.workTypeId !== workTypeFilter) return false;
            return true;
        });
    }, [initialSuppliers, debouncedSearchTerm, groupFilter, workTypeFilter]);

    
    const exportToExcel = () => {
        const dataToExport = filteredSuppliers.map(s => ({
            'الاسم': s.name,
            'الهاتف': s.phone,
            'البريد الإلكتروني': s.email || '-',
            'العنوان': s.address || '-',
            'المجموعة': companyGroups.find(g => g.id === s.groupId)?.name || '-',
            'نوع العمل': workTypes.find(w => w.id === s.workTypeId)?.name || '-',
            'الحالة': s.status === 'active' ? 'نشط' : 'غير نشط',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "الموردين");
        XLSX.writeFile(workbook, "Suppliers.xlsx");
    };

    const filteredGroups = companyGroups.filter(g => g.type === 'supplier' || g.type === 'both');
    const filteredWorkTypes = workTypes.filter(w => w.appliesTo.includes('supplier'));
    
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">إدارة الموردين</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-muted-foreground">
                                    عرض وتعديل بيانات الموردين.
                                </p>
                                <Badge variant="outline">عرض {filteredSuppliers.length} من {initialSuppliers.length} مورد</Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant={viewMode === 'table' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('table')}>
                                <List className="h-4 w-4" />
                            </Button>
                            <Button variant={viewMode === 'cards' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('cards')}>
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                             <AddClientDialog onClientAdded={onDataChanged}>
                                 <Button><PlusCircle className="me-2 h-4 w-4"/> إضافة جديدة</Button>
                             </AddClientDialog>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="بحث بالاسم أو الهاتف..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="ps-10"
                            />
                            {searchTerm && (
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <Select value={groupFilter} onValueChange={setGroupFilter}>
                            <SelectTrigger><SelectValue placeholder="كل المجموعات"/></SelectTrigger>
                            <SelectContent><SelectItem value="all">كل المجموعات</SelectItem>{filteredGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                        </Select>
                         <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
                            <SelectTrigger><SelectValue placeholder="كل أنواع العمل"/></SelectTrigger>
                            <SelectContent><SelectItem value="all">كل أنواع العمل</SelectItem>{filteredWorkTypes.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={exportToExcel} variant="outline" className="w-full sm:w-auto">
                            <Download className="me-2 h-4 w-4" /> تصدير
                        </Button>
                    </div>

                    {viewMode === 'table' ? (
                        <SuppliersTable 
                            data={filteredSuppliers}
                            companyGroups={companyGroups}
                            workTypes={workTypes}
                            onDataChanged={onDataChanged}
                        />
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredSuppliers.map(row => (
                                    <ClientCard key={row.id} client={row} />
                                ))}
                            </div>
                            {filteredSuppliers.length === 0 && <p className="col-span-full text-center p-8 text-muted-foreground">لا توجد نتائج تطابق الفلتر.</p>}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
