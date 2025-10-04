
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search, ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDebounce } from "@/hooks/use-debounce"
import { searchClients } from "@/app/relations/actions"
import { useVoucherNav } from "@/context/voucher-nav-context"
import { Input } from "./input"
import { Badge } from "./badge"
import type { RelationType, CompanyPaymentType, Airport } from "@/lib/types"

type AutocompleteOption = {
    value: string;
    label: string;
    relationType?: RelationType;
    paymentType?: CompanyPaymentType;
    // For airport options
    country?: string;
    city?: string;
    arabicName?: string;
    arabicCountry?: string;
    useCount?: number;
};

type SearchAction = (options: { searchTerm?: string, includeInactive?: boolean }) => Promise<AutocompleteOption[]>;

const searchActions: Record<string, SearchAction> = {
    clients: (options) => searchClients({ ...options, relationType: 'client' }),
    suppliers: (options) => searchClients({ ...options, relationType: 'supplier' }),
    all: searchClients,
};

interface AutocompleteProps {
    searchAction?: 'clients' | 'suppliers' | 'users' | 'boxes' | 'all';
    options?: AutocompleteOption[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    includeInactive?: boolean;
}

const CommandFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="py-1 px-2 text-xs text-center text-muted-foreground bg-muted/50 border-t">
    {children}
  </div>
);

const getPaymentTypeLabel = (type?: CompanyPaymentType) => {
    switch (type) {
        case 'cash': return 'نقدي';
        case 'credit': return 'آجل';
        default: return '';
    }
}

const getRelationTypeLabel = (type?: RelationType) => {
    switch (type) {
        case 'client': return 'عميل';
        case 'supplier': return 'مورد';
        case 'both': return 'عميل ومورد';
        default: return '';
    }
};


export function Autocomplete({ searchAction, options: staticOptions, value, onValueChange, placeholder, disabled = false, includeInactive = false }: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false);
  const debouncedSearchTerm = useDebounce(inputValue, 400);

  const [page, setPage] = React.useState(0);
  const itemsPerPage = 10;

  const { data: navData, loaded: navDataLoaded } = useVoucherNav();
  
  const baseOptions = React.useMemo(() => {
    if (!navDataLoaded) return [];

    let options: AutocompleteOption[] = [];
    
    const createLabel = (c: any) => {
        return `${c.name}${c.code ? ` (${c.code})` : ''}`;
    };

    switch(searchAction) {
        case 'clients':
            options = (navData.clients || []).filter(c => c.relationType === 'client' || c.relationType === 'both').map(c => ({ value: c.id, label: createLabel(c), relationType: c.relationType, paymentType: c.paymentType }));
            break;
        case 'suppliers':
             options = (navData.suppliers || []).filter(c => c.relationType === 'supplier' || c.relationType === 'both').map(s => ({ value: s.id, label: createLabel(s), relationType: s.relationType, paymentType: s.paymentType }));
            break;
        case 'users':
            options = (navData.users || []).map(u => ({ value: u.uid, label: u.name }));
            break;
        case 'boxes':
            options = (navData.boxes || []).map(b => ({ value: b.id, label: b.name }));
            break;
        case 'all':
        default:
             options = [
                ...(navData.clients || []).map(c => ({ value: c.id, label: createLabel(c), relationType: c.relationType, paymentType: c.paymentType })),
                ...(navData.suppliers || []).map(s => ({ value: s.id, label: createLabel(s), relationType: s.relationType, paymentType: s.paymentType })),
                ...(navData.boxes || []).map(b => ({ value: b.id, label: `صندوق: ${b.name}` })),
            ]
    }
    
    if (staticOptions) {
      return [...staticOptions, ...options].sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
    }
    
    return options;
  }, [staticOptions, navData, navDataLoaded, searchAction]);


  const selectedOption = React.useMemo(() => {
    return baseOptions.find((option) => option?.value === value)
  }, [baseOptions, value]);

  const handleSelect = (currentValue: string) => {
    const selected = optionsToDisplay.find(opt => opt.value.toLowerCase() === currentValue.toLowerCase());
    onValueChange(selected ? selected.value : "")
    setInputValue("")
    setOpen(false)
  }

  const optionsToDisplay = React.useMemo(() => {
    if (!inputValue) {
        setPage(0);
        return baseOptions;
    }
    const lowercasedInput = inputValue.toLowerCase();
    const filtered = baseOptions.filter(option => 
      option.label.toLowerCase().includes(lowercasedInput) ||
      (option.arabicName && option.arabicName.toLowerCase().includes(lowercasedInput)) ||
      (option.city && option.city.toLowerCase().includes(lowercasedInput))
    );
    setPage(0);
    return filtered;

  }, [baseOptions, inputValue]);
  
  const paginatedOptions = React.useMemo(() => {
      const start = page * itemsPerPage;
      return optionsToDisplay.slice(start, start + itemsPerPage);
  }, [optionsToDisplay, page, itemsPerPage]);
  
  const totalPages = Math.ceil(optionsToDisplay.length / itemsPerPage);


  const getRelationTypeLabel = (type?: RelationType) => {
      switch(type) {
          case 'client': return 'عميل';
          case 'supplier': return 'مورد';
          case 'both': return 'عميل ومورد';
          default: return '';
      }
  }
  
  const isAirportSearch = staticOptions?.some(opt => opt.country && opt.city);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8"
          disabled={disabled}
        >
          <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
            {selectedOption ? (isAirportSearch ? selectedOption.value : selectedOption.label) : placeholder || "Select..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-auto p-0">
        <Command shouldFilter={false}>
          <CommandInput 
             placeholder={placeholder || "بحث..."} 
             value={inputValue} 
             onValueChange={setInputValue}
          />
          <CommandList>
              {isLoading && <div className="p-2 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}
              {!isLoading && paginatedOptions.length === 0 && (
                <CommandEmpty>
                  لا توجد نتائج.
                </CommandEmpty>
              )}
            <CommandGroup>
              {paginatedOptions.map((option, index) => (
                <CommandItem
                  key={`${option.value}-${index}`}
                  value={option.value}
                  onSelect={handleSelect}
                  className={cn("flex justify-between items-center", isAirportSearch ? "p-2" : "")}
                >
                    {isAirportSearch ? (
                      <>
                        <div className="flex-grow text-right">
                          <p className="font-bold text-sm">{option.arabicName || option.city}</p>
                          <p className="text-xs text-muted-foreground">{option.arabicCountry || option.country}</p>
                        </div>
                        <Badge variant="secondary" className="font-mono text-sm px-2 py-1 ml-3">{option.value}</Badge>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">
                            <Check
                                className={cn(
                                "mr-2 h-4 w-4",
                                value === option.value ? "opacity-100" : "opacity-0"
                                )}
                            />
                            <span>{option.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             {option.paymentType && <Badge variant="outline">{getPaymentTypeLabel(option.paymentType)}</Badge>}
                             {option.relationType && <Badge variant="secondary">{getRelationTypeLabel(option.relationType)}</Badge>}
                        </div>
                      </>
                    )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
           {optionsToDisplay.length > itemsPerPage && (
                <CommandFooter>
                    <div className="flex items-center justify-between px-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                            <ArrowRight className="h-4 w-4"/>
                        </Button>
                        <span>صفحة {page + 1} من {totalPages}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                             <ArrowLeft className="h-4 w-4"/>
                        </Button>
                    </div>
                </CommandFooter>
            )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

  