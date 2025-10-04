
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Share2, MessageCircle, Settings, Save, RotateCcw, Loader2, Search, Pin, PinOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getWhatsappContacts, getWhatsappGroups } from '@/app/campaigns/actions';
import type { WhatsappContact, WhatsappGroup } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';

const MESSAGE_TEMPLATE_KEY = 'exchangeBalanceMessageTemplate';
const PINNED_CHAT_ID_KEY = 'exchangeBalancePinnedChatId';
const DEFAULT_TEMPLATE = 'الرصيد النهائي لـ {exchangeName} هو: {balance} USD';

interface ShareBalanceDialogProps {
  exchangeName: string;
  balance: number;
  children: React.ReactNode;
}

export default function ShareBalanceDialog({ exchangeName, balance, children }: ShareBalanceDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [pinnedChatId, setPinnedChatId] = useState('');
  
  // State for contacts and groups
  const [contacts, setContacts] = useState<WhatsappContact[]>([]);
  const [groups, setGroups] = useState<WhatsappGroup[]>([]);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);


  const loadAudienceData = useCallback(async () => {
      // This assumes a default or single WhatsApp account is configured.
      // In a multi-account setup, you'd need to pass the accountId.
      // For now, let's assume the first account found is the one to use.
      setLoadingAudience(true);
      try {
        //   const accountsResult = await getWhatsappAccounts();
        //   const accountId = accountsResult.accounts?.[0]?.id;
        //   if (accountId) {
        //       const [contactsData, groupsData] = await Promise.all([
        //           getWhatsappContacts(accountId),
        //           getWhatsappGroups(accountId)
        //       ]);
        //       setContacts(contactsData);
        //       setGroups(groupsData);
        //   }
      } catch (error) {
          console.error("Failed to load WhatsApp audience:", error);
          toast({ title: "فشل تحميل جهات الاتصال", variant: "destructive" });
      } finally {
          setLoadingAudience(false);
      }
  }, [toast]);
  
  useEffect(() => {
    if (open) {
        const savedTemplate = localStorage.getItem(MESSAGE_TEMPLATE_KEY) || DEFAULT_TEMPLATE;
        const savedChatId = localStorage.getItem(PINNED_CHAT_ID_KEY) || '';
        setTemplate(savedTemplate);
        setPinnedChatId(savedChatId);
        const formattedBalance = balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const generatedMessage = savedTemplate
            .replace('{exchangeName}', exchangeName)
            .replace('{balance}', formattedBalance);
        setMessage(generatedMessage);
        
        if (isEditingTemplate) {
            loadAudienceData();
        }
    }
  }, [open, exchangeName, balance, isEditingTemplate, loadAudienceData]);
  
  const handleSaveTemplate = () => {
    localStorage.setItem(MESSAGE_TEMPLATE_KEY, template);
    localStorage.setItem(PINNED_CHAT_ID_KEY, pinnedChatId);
    toast({ title: 'تم حفظ القالب والإعدادات بنجاح' });
    setIsEditingTemplate(false);
  };

  const handleResetTemplate = () => {
    setTemplate(DEFAULT_TEMPLATE);
    setPinnedChatId('');
    localStorage.removeItem(MESSAGE_TEMPLATE_KEY);
    localStorage.removeItem(PINNED_CHAT_ID_KEY);
    toast({ title: 'تمت استعادة الإعدادات الافتراضية' });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `رصيد ${exchangeName}`,
          text: message,
        });
        toast({ title: "تمت مشاركة الرصيد بنجاح" });
      } catch (error) {
        // Don't show an error if the user cancels the share sheet
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error("Error sharing:", error);
          toast({
            title: "فشلت المشاركة",
            description: "قد يكون المتصفح لا يدعم هذه الميزة أو تم إلغاء العملية.",
            variant: "destructive",
          });
        }
      }
    } else {
      navigator.clipboard.writeText(message);
      toast({
        title: "تم نسخ الرصيد",
        description: "ميزة المشاركة غير مدعومة في هذا المتصفح. تم نسخ الرسالة إلى الحافظة.",
      });
    }
  };
  

  const handleWhatsAppShare = (chatId?: string) => {
    const finalChatId = chatId || pinnedChatId;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = finalChatId 
        ? `https://wa.me/${String(finalChatId).replace(/[@c.us|@g.us]/g, '')}?text=${encodedMessage}`
        : `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };
  
  const filteredAudience = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    const all = [...contacts, ...groups];
    if (!lowercasedTerm) return all;
    return all.filter(item => item.name.toLowerCase().includes(lowercasedTerm));
  }, [contacts, groups, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
            <div className="flex items-center justify-between">
                 <Button variant="ghost" size="icon" onClick={() => setIsEditingTemplate(p => !p)}>
                    <Settings className="h-5 w-5" />
                </Button>
                <div className="text-right">
                    <DialogTitle>مشاركة رصيد: {exchangeName}</DialogTitle>
                    <DialogDescription>
                        يمكنك تعديل الرسالة أدناه ثم مشاركتها عبر التطبيقات المختلفة.
                    </DialogDescription>
                </div>
            </div>
        </DialogHeader>

        {isEditingTemplate ? (
            <div className="py-4 space-y-4 border-t border-b">
                 <h4 className="font-semibold">تعديل القالب والوجهة الافتراضية</h4>
                <div className="space-y-1.5">
                    <Label htmlFor="template-editor">قالب الرسالة</Label>
                    <Textarea 
                        id="template-editor"
                        value={template} 
                        onChange={(e) => setTemplate(e.target.value)}
                        rows={3} 
                        className="text-right font-mono"
                        dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">استخدم `&#123;exchangeName&#125;` و `&#123;balance&#125;` كمتغيرات.</p>
                </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="pinned-chat-id">الوجهة الافتراضية المثبتة</Label>
                     {pinnedChatId ? (
                        <div className="flex items-center justify-between p-2 bg-muted rounded-md border">
                            <span className="font-mono text-xs">{pinnedChatId}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setPinnedChatId('')}>
                                <PinOff className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                         <p className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-md border">لا توجد وجهة مثبتة حاليًا.</p>
                    )}
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                        <Input placeholder="ابحث في جهات الاتصال والمجموعات..." className="ps-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                     </div>
                    <ScrollArea className="h-48 border rounded-md">
                        {loadingAudience ? <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto"/></div> : (
                            <div className="p-1">
                                {filteredAudience.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                                        <div className="text-right">
                                            <p className="font-semibold text-sm">{item.name}</p>
                                            <p className="text-xs font-mono text-muted-foreground">{item.id}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="sm" variant="outline" onClick={() => handleWhatsAppShare(item.id)}>إرسال</Button>
                                            <Button size="icon" variant="ghost" onClick={() => setPinnedChatId(item.id)}><Pin className="h-4 w-4"/></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                 </div>
                 
                 <div className="flex justify-between">
                    <Button variant="ghost" onClick={handleResetTemplate}><RotateCcw className="me-2 h-4 w-4" />استعادة الافتراضي</Button>
                    <Button onClick={handleSaveTemplate}><Save className="me-2 h-4 w-4"/>حفظ القالب والإعدادات</Button>
                </div>
            </div>
        ) : (
            <div className="py-4 border-t border-b">
            <Textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                rows={3} 
                className="text-lg text-center font-semibold"
                dir="rtl"
            />
            </div>
        )}
        
        <DialogFooter className="gap-2 pt-4">
          <Button onClick={() => handleWhatsAppShare()} className="w-full bg-green-600 hover:bg-green-700">
            <MessageCircle className="me-2 h-4 w-4" />
            فتح WhatsApp
          </Button>
          <Button onClick={handleShare} className="w-full" variant="secondary">
            <Share2 className="me-2 h-4 w-4" />
            مشاركة عامة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
