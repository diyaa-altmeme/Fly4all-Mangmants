
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, ChevronsUpDown, Weight, RefreshCw, Search, Filter } from 'lucide-react';
import type { Client, Supplier } from '@/lib/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import FlyChangesTable from './fly-changes-table';
import { type FlyChangeOrBaggage } from '../actions';
import AddChangeOrBaggageDialog from './add-change-or-baggage-dialog';
import InlineNewChangeOrBaggageForm from './inline-new-change-or-baggage-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';

interface FlyChangesContentProps {
  initialData: FlyChangeOrBaggage[];
  clients: Client[];
  suppliers: Supplier[];
}

export default function FlyChangesContent({ initialData, clients, suppliers }: FlyChangesContentProps) {
  const [data, setData] = useState(initialData);
  const [showInlineForm, setShowInlineForm] = useState<false | 'change' | 'baggage'>(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [stagedFilters, setStagedFilters] = useState({ searchField: 'all' });
  const [appliedFilters, setAppliedFilters] = useState(stagedFilters);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const refreshData = () => {
      // In a real app, this would trigger a re-fetch.
      // For now, we will rely on a manual refresh button if needed.
      // Or we can optimistically update the state.
      // Let's assume revalidation works.
  }

  const handleSuccess = () => {
      setShowInlineForm(false);
      // In a real app, this would trigger a re-fetch.
      // For now, we will rely on a manual refresh button if needed.
      // Or we can optimistically update the state.
      // Let's assume revalidation works.
  }
  
  const handleApplyFilters = () => {
      setAppliedFilters(stagedFilters);
  }

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm && appliedFilters.searchField === 'all') return data;
    
    return data.filter(item => {
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        const supplierName = suppliers.find(s => s.id === item.supplierId)?.name || '';
        const beneficiaryName = clients.find(c => c.id === item.beneficiaryId)?.name || '';

        const filterField = appliedFilters.searchField;

        if (filterField !== 'all') {
            if (!lowercasedTerm) return true;
             switch (filterField) {
                case 'invoiceNumber': return (item.invoiceNumber || '').toLowerCase().includes(lowercasedTerm);
                case 'pnr': return (item.pnr || '').toLowerCase().includes(lowercasedTerm);
                case 'supplier': return supplierName.toLowerCase().includes(lowercasedTerm);
                case 'beneficiary': return beneficiaryName.toLowerCase().includes(lowercasedTerm);
                default: return true;
            }
        }
        
        // General search on all fields
        return (item.invoiceNumber || '').toLowerCase().includes(lowercasedTerm) ||
               (item.pnr || '').toLowerCase().includes(lowercasedTerm) ||
               supplierName.toLowerCase().includes(lowercasedTerm) ||
               beneficiaryName.toLowerCase().includes(lowercasedTerm);
    });
  }, [data, debouncedSearchTerm, appliedFilters, suppliers, clients]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex w-full sm:w-auto items-center gap-2">
            <AddChangeOrBaggageDialog clients={clients} suppliers={suppliers} onSuccess={refreshData}>
                 <Button>
                    <PlusCircle className="me-2 h-4 w-4" /> إضافة جديدة
                </Button>
            </AddChangeOrBaggageDialog>

           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                إضافة سريعة <ChevronsUpDown className="ms-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setShowInlineForm('change')}>
                    <RefreshCw className="me-2 h-4 w-4"/> إضافة تغيير سريع
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowInlineForm('baggage')}>
                    <Weight className="me-2 h-4 w-4"/> إضافة وزن سريع
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 w-full flex-wrap sm:w-auto sm:flex-nowrap justify-end">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="بحث..."
                    className="ps-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={stagedFilters.searchField} onValueChange={(v) => setStagedFilters(f => ({...f, searchField: v}))}>
                <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">بحث عام</SelectItem>
                    <SelectItem value="invoiceNumber">رقم الفاتورة</SelectItem>
                    <SelectItem value="pnr">PNR</SelectItem>
                    <SelectItem value="supplier">الجهة المصدرة</SelectItem>
                    <SelectItem value="beneficiary">المستفيد</SelectItem>
                </SelectContent>
            </Select>
            <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
                <Filter className="me-2 h-4 w-4" />
                تطبيق
            </Button>
        </div>
      </div>
      
       {showInlineForm && (
            <InlineNewChangeOrBaggageForm
                type={showInlineForm}
                clients={clients}
                suppliers={suppliers}
                onSuccess={handleSuccess}
                onCancel={() => setShowInlineForm(false)}
            />
        )}
      
      <FlyChangesTable 
        data={filteredData}
        clients={clients}
        suppliers={suppliers}
        onSuccess={refreshData}
      />
    </div>
  );
}
