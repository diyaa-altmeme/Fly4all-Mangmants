
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings, Percent } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { type SegmentSettings, type Client } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { produce } from 'immer';
import { updateClient } from '@/app/clients/actions';

const InputWithPercentage = ({ value, onChange, ...props }: { value: any, onChange: (e: any) => void, readOnly?: boolean }) => (
    <div className="relative">
      <Input type="text" inputMode="decimal" className="pe-7" value={value} onChange={onChange} {...props} />
      <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
);


interface SegmentSettingsDialogProps {
  clients: Client[];
  onSettingsSaved: () => void;
}

export default function SegmentSettingsDialog({ clients, onSettingsSaved }: SegmentSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localClients, setLocalClients] = useState<Client[]>([]);
  
  const defaultSettings: SegmentSettings = {
    ticketProfitPercentage: 50,
    visaProfitPercentage: 100,
    hotelProfitPercentage: 100,
    groupProfitPercentage: 100,
    alrawdatainSharePercentage: 50,
  };

  useEffect(() => {
    if (open) {
      const clientsWithDefaults = clients.map(c => ({
          ...c,
          segmentSettings: c.segmentSettings || defaultSettings
      }));
      setLocalClients(clientsWithDefaults);
    }
  }, [open, clients]);
  
  const handleSettingChange = (clientId: string, field: keyof SegmentSettings, value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) return;

    setLocalClients(produce(draft => {
        const client = draft.find(c => c.id === clientId);
        if (client) {
            if (!client.segmentSettings) client.segmentSettings = defaultSettings;
            (client.segmentSettings[field] as number) = numericValue;
        }
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    let successCount = 0;
    
    for (const client of localClients) {
        if (client.segmentSettings) {
             const result = await updateClient(client.id, { segmentSettings: client.segmentSettings });
             if (result.success) {
                 successCount++;
             }
        }
    }
    
    toast({
        title: "تم حفظ الإعدادات",
        description: `تم تحديث إعدادات ${successCount} شركة بنجاح.`,
    });
    onSettingsSaved(); // To refetch data on the main page
    setIsSaving(false);
    setOpen(false);
  };
  
  const filteredClients = localClients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Settings className="me-2 h-4 w-4" />
            إعدادات الشركات
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
            <DialogTitle>إعدادات السكمنت الخاصة بالشركات</DialogTitle>
            <DialogDescription>
                تحكم في النسب المئوية المستخدمة لحساب الأرباح وتوزيعها لكل شركة على حدة.
            </DialogDescription>
        </DialogHeader>
        <div className="py-2">
            <Input 
                placeholder="ابحث عن شركة..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <ScrollArea className="flex-grow border-t pt-2">
            <div className="space-y-4 pr-3">
                {filteredClients.map(client => (
                    <div key={client.id} className="p-4 border rounded-lg">
                        <h4 className="font-bold text-lg mb-3">{client.name}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                             <div className="space-y-1">
                                <Label>ربح التذاكر</Label>
                                <InputWithPercentage value={client.segmentSettings?.ticketProfitPercentage ?? ''} onChange={(e: any) => handleSettingChange(client.id, 'ticketProfitPercentage', e.target.value)} />
                             </div>
                             <div className="space-y-1">
                                <Label>ربح الفيزا</Label>
                                <InputWithPercentage value={client.segmentSettings?.visaProfitPercentage ?? ''} onChange={(e: any) => handleSettingChange(client.id, 'visaProfitPercentage', e.target.value)} />
                             </div>
                             <div className="space-y-1">
                                <Label>ربح الفنادق</Label>
                                <InputWithPercentage value={client.segmentSettings?.hotelProfitPercentage ?? ''} onChange={(e: any) => handleSettingChange(client.id, 'hotelProfitPercentage', e.target.value)} />
                             </div>
                             <div className="space-y-1">
                                <Label>ربح الكروبات</Label>
                                <InputWithPercentage value={client.segmentSettings?.groupProfitPercentage ?? ''} onChange={(e: any) => handleSettingChange(client.id, 'groupProfitPercentage', e.target.value)} />
                             </div>
                             <div className="space-y-1">
                                <Label>حصة الروضتين</Label>
                                <InputWithPercentage value={client.segmentSettings?.alrawdatainSharePercentage ?? ''} onChange={(e: any) => handleSettingChange(client.id, 'alrawdatainSharePercentage', e.target.value)} />
                             </div>
                             <div className="space-y-1">
                                <Label>حصة الشريك</Label>
                                <InputWithPercentage readOnly value={100 - (client.segmentSettings?.alrawdatainSharePercentage || 0)} onChange={() => {}} />
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
            <Button size="lg" onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                حفظ كل التغييرات
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
