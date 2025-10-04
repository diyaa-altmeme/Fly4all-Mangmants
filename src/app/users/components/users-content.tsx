
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { User, Box, Role, HrData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Calendar as CalendarIcon, Filter, Loader2 } from 'lucide-react';
import { DataTable } from './users-table';
import { getColumns } from './columns';
import { produce } from 'immer';
import UserFormDialog from './user-form-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';

interface UsersContentProps {
  initialUsers: HrData[];
  boxes: Box[];
  roles: Role[];
  onDataChange: (dateRange?: DateRange) => void;
}

export default function UsersContent({ initialUsers, boxes, roles, onDataChange }: UsersContentProps) {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [date, setDate] = React.useState<DateRange | undefined>({
      from: subDays(new Date(), 30),
      to: new Date(),
  });
   const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);
  
  const handleSuccess = () => {
      onDataChange(date);
  }

  const filteredUsers = useMemo(() => {
    if (!debouncedSearchTerm) return users;
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return users.filter(user => 
        user.name.toLowerCase().includes(lowercasedTerm) ||
        user.username.toLowerCase().includes(lowercasedTerm) ||
        user.email.toLowerCase().includes(lowercasedTerm) ||
        (user.department || '').toLowerCase().includes(lowercasedTerm)
    );
  }, [users, debouncedSearchTerm]);

  const columns = useMemo(() => {
    return getColumns({
      boxes: boxes,
      roles: roles,
      onSuccess: handleSuccess
    });
  }, [boxes, roles, handleSuccess]);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="بحث بالاسم, البريد الإلكتروني, القسم..."
                className="ps-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
             <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                    date.to ? (
                        <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(date.from, "LLL dd, y")
                    )
                    ) : (
                    <span>اختر فترة</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
            <Button onClick={() => onDataChange(date)} disabled={isLoading}>
                {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Filter className="me-2 h-4 w-4" />}
                تطبيق الفلتر
            </Button>
        </div>
        <UserFormDialog boxes={boxes} roles={roles} onUserAdded={handleSuccess} onUserUpdated={handleSuccess}>
            <Button>
                <PlusCircle className="me-2 h-4 w-4" />
                إضافة موظف جديد
            </Button>
        </UserFormDialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <DataTable columns={columns} data={filteredUsers} />
      </div>
    </div>
  );
}
