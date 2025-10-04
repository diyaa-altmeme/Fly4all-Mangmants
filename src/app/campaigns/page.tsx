
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Send, Loader2, Smartphone, Battery, BatteryCharging, Briefcase, Bot, History, Users, UserCheck, UserPlus } from 'lucide-react';
import AudienceSelector from './components/audience-selector';
import MessageComposer from './components/message-composer';
import CampaignSettingsDialog from './components/campaign-settings-dialog';
import type { WhatsappContact, WhatsappGroup, WhatsappAccount, WhatsappGroupParticipant, WhatsappAccountWithStatus } from '@/lib/types';
import { getWhatsappAccounts, getWhatsappContacts, getWhatsappGroups, getWhatsappGroupParticipants, getWhatsappAccountStatus } from './actions';
import { sendWhatsappMessage, type SendResult } from './send-actions';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import AddParticipantToGroupsDialog from './components/add-participant-to-groups-dialog';

const statusConfig: { [key: string]: { label: string; color: string; } } = {
    'connected': { label: 'متصل', color: 'bg-green-500' },
    'authorized': { label: 'متصل', color: 'bg-green-500' },
    'got qr code': { label: 'يحتاج مسح QR', color: 'bg-yellow-500' },
    'notAuthorized': { label: 'يحتاج مسح QR', color: 'bg-yellow-500' },
    'error': { label: 'خطأ بالاتصال', color: 'bg-red-500' },
    'loading': { label: 'جاري المزامنة...', color: 'bg-gray-400 animate-pulse' }
};

const AccountCard = ({ account, onClick, isSelected }: { account: WhatsappAccountWithStatus, onClick: () => void, isSelected: boolean }) => {
    const statusInfo = statusConfig[account.status?.status || 'error'] || { label: 'غير معروف', color: 'bg-gray-500' };
    const displayName = account.status?.name || account.name;
    const fallbackLetter = displayName?.charAt(0).toUpperCase() || 'U';
    
    return (
        <Card id={`account-card-${account.id}`} onClick={onClick} className={cn(
            "cursor-pointer transition-all hover:shadow-md shrink-0 w-64 border-2",
            isSelected ? "bg-primary/10 border-primary" : "border-transparent"
        )}>
            <CardContent className="flex flex-col gap-3 p-3">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar className="h-14 w-14 border">
                            <AvatarImage src={account.status?.profile_picture || account.status?.urlAvatar} alt={displayName}/>
                            <AvatarFallback>{fallbackLetter}</AvatarFallback>
                        </Avatar>
                        <span className={cn("absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-background", statusInfo.color)} />
                    </div>
                    <div className="flex-grow">
                        <p className="font-bold">{displayName}</p>
                        <p className="text-xs text-muted-foreground">{statusInfo.label}</p>
                    </div>
                </div>
                 {account.status?.status === 'connected' && (
                     <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                     <div className="flex items-center gap-1">
                                        {account.status.battery_charging ? <BatteryCharging className="h-4 w-4 text-green-500" /> : <Battery className="h-4 w-4" />}
                                        <span>{account.status.battery || 'N/A'}%</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent><p>مستوى البطارية</p></TooltipContent>
                            </Tooltip>
                              <Tooltip>
                                <TooltipTrigger>
                                     <div className="flex items-center gap-1">
                                        <Bot className="h-4 w-4" />
                                        <span>{account.status.wa_version}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent><p>إصدار واتساب</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger>
                                    <Badge variant="outline">{account.status.is_business ? 'حساب أعمال' : 'حساب شخصي'}</Badge>
                                </TooltipTrigger>
                                <TooltipContent><p>نوع الحساب</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                     </div>
                 )}
                  {(account.status?.status === 'got qr code') && account.status?.qrCode &&
                    <div className="p-2 bg-white rounded-md">
                        <Image src={account.status.qrCode} alt="QR Code" width={150} height={150} className="mx-auto" />
                    </div>
                }
            </CardContent>
        </Card>
    )
}

const StatCard = ({ icon: Icon, title, value }: { icon: React.ElementType, title: string, value: number}) => (
    <div className="p-4 rounded-lg flex items-center gap-4 bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);

type SendProgressState = {
    total: number;
    sent: number;
    failed: number;
    progress: number;
    isSending: boolean;
};

const SendProgressDialog = ({ open, state }: { open: boolean; state: SendProgressState }) => {
    return (
        <Dialog open={open}>
            <DialogContent showCloseButton={!state.isSending}>
                <DialogHeader>
                    <DialogTitle>جاري إرسال الحملة...</DialogTitle>
                    <DialogDescription>
                        يرجى الانتظار حتى تكتمل عملية الإرسال. لا تقم بإغلاق هذه الصفحة.
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-4 py-4">
                    <Progress value={state.progress} className="w-full" />
                    <div className="flex justify-between text-sm font-medium">
                        <span>المرسل: {state.sent} / {state.total}</span>
                        <span>الفاشل: {state.failed}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function CampaignsPage() {
    const [accounts, setAccounts] = useState<WhatsappAccountWithStatus[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [contacts, setContacts] = useState<WhatsappContact[]>([]);
    const [groups, setGroups] = useState<WhatsappGroup[]>([]);
    const [groupParticipants, setGroupParticipants] = useState<WhatsappGroupParticipant[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    
    const [selectedContacts, setSelectedContacts] = useState<WhatsappContact[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<WhatsappGroup[]>([]);
    const [selectedParticipants, setSelectedParticipants] = useState<WhatsappGroupParticipant[]>([]);
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);

    const [sendProgress, setSendProgress] = useState<SendProgressState>({ total: 0, sent: 0, failed: 0, progress: 0, isSending: false });
    
    const { toast } = useToast();
    const accountsContainerRef = useRef<HTMLDivElement>(null);

    const fileToDataUri = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const fetchAccounts = useCallback(async () => {
        setLoadingAccounts(true);
        try {
            const result = await getWhatsappAccounts();
            if (result.success && result.accounts) {
                const accountsWithStatusPlaceholders = result.accounts.map(acc => ({
                    ...acc,
                    status: { status: 'loading', message: 'جاري المزامنة...' }
                }));
                setAccounts(accountsWithStatusPlaceholders);

                const accountsWithStatus = await Promise.all(
                    result.accounts.map(async (acc) => ({
                        ...acc,
                        status: await getWhatsappAccountStatus(acc.id)
                    }))
                );
                
                setAccounts(accountsWithStatus);
                const defaultAccount = accountsWithStatus.find(a => a.isDefault && isAccountConnected(a.status));
                if (defaultAccount) {
                    setSelectedAccount(defaultAccount.id);
                } else {
                    const firstConnected = accountsWithStatus.find(a => isAccountConnected(a.status));
                    if (firstConnected) setSelectedAccount(firstConnected.id);
                }
            } else {
                 toast({ title: "خطأ", description: result.error, variant: 'destructive' });
            }
        } catch (error: any) {
             toast({ title: "خطأ", description: error.message, variant: 'destructive' });
        }
        setLoadingAccounts(false);
    }, [toast]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);
    
    useEffect(() => {
        if (!selectedAccount) {
            setContacts([]);
            setGroups([]);
            setGroupParticipants([]);
            return;
        }

        const fetchContactsAndGroups = async () => {
            setLoadingContacts(true);
            setLoadingGroups(true);
            try {
                const [contactsResult, groupsResult] = await Promise.all([
                    getWhatsappContacts(selectedAccount),
                    getWhatsappGroups(selectedAccount)
                ]);
                setContacts(contactsResult);
                setGroups(groupsResult);
                return groupsResult; // Return groups for the next step
            } catch (error: any) {
                toast({
                    title: "خطأ في جلب البيانات",
                    description: error.message || "فشل تحميل جهات الاتصال والمجموعات.",
                    variant: "destructive"
                });
                return [];
            } finally {
                setLoadingContacts(false);
                setLoadingGroups(false);
            }
        };

        const fetchParticipants = async (groupsToFetch: WhatsappGroup[]) => {
            setLoadingParticipants(true);
            const allParticipants: WhatsappGroupParticipant[] = [];
            const participantIds = new Set<string>();

            for (const group of groupsToFetch) {
                 if(group.iAmAdmin) { // Only fetch participants if we are admin
                    try {
                        const participants = await getWhatsappGroupParticipants(selectedAccount, group.id);
                        participants.forEach(p => {
                            if (p.id && !participantIds.has(p.id)) {
                                allParticipants.push(p);
                                participantIds.add(p.id);
                            }
                        });
                    } catch (error) {
                        console.warn(`Failed to fetch participants for group ${group.name}:`, error);
                    }
                    await new Promise(resolve => setTimeout(resolve, 200));
                 }
            }
            setGroupParticipants(allParticipants);
            setLoadingParticipants(false);
        };

        const runDataFetchFlow = async () => {
            const fetchedGroups = await fetchContactsAndGroups();
            if (fetchedGroups.length > 0) {
                await fetchParticipants(fetchedGroups);
            }
        };
        
        runDataFetchFlow();

    }, [selectedAccount, toast]);
    
    const handleAccountSelection = (accountId: string) => {
        setSelectedAccount(accountId);
        const cardElement = document.getElementById(`account-card-${accountId}`);
        if (cardElement && accountsContainerRef.current) {
            const container = accountsContainerRef.current;
            const scrollLeft = cardElement.offsetLeft - (container.offsetWidth / 2) + (cardElement.offsetWidth / 2);
            container.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }
    };


    const handleSend = async () => {
        const uniqueRecipients = Array.from(new Set([
            ...selectedContacts.map(c => c.id),
            ...selectedGroups.map(g => g.id),
            ...selectedParticipants.map(p => p.id),
        ]));

        if (uniqueRecipients.length === 0) {
            toast({ title: 'لم يتم تحديد مستلمين', variant: 'destructive' });
            return;
        }

        let attachmentPayload: { dataUri: string; filename: string } | undefined = undefined;
        if (attachment) {
            attachmentPayload = {
                dataUri: await fileToDataUri(attachment),
                filename: attachment.name,
            };
        }

        setSendProgress({ total: uniqueRecipients.length, sent: 0, failed: 0, progress: 0, isSending: true });

        try {
            // Using a for...of loop to send messages one by one to better track progress
            for (let i = 0; i < uniqueRecipients.length; i++) {
                const recipient = uniqueRecipients[i];
                const results = await sendWhatsappMessage({
                    accountId: selectedAccount,
                    recipients: [recipient],
                    message,
                    attachment: attachmentPayload,
                });

                setSendProgress(prev => {
                    const newSent = prev.sent + (results[0].success ? 1 : 0);
                    const newFailed = prev.failed + (results[0].success ? 0 : 1);
                    return {
                        ...prev,
                        sent: newSent,
                        failed: newFailed,
                        progress: ((newSent + newFailed) / prev.total) * 100,
                    };
                });
            }
             toast({ title: "اكتملت الحملة", description: `تم إرسال ${sendProgress.sent} رسالة بنجاح، وفشل إرسال ${sendProgress.failed} رسالة.` });
        } catch (error: any) {
            toast({ title: "خطأ فادح في الإرسال", description: error.message, variant: 'destructive' });
        } finally {
            setSendProgress(prev => ({...prev, isSending: false}));
        }
    };
    
    const totalRecipients = new Set([...selectedContacts.map(c => c.id), ...selectedGroups.map(g => g.id), ...selectedParticipants.map(p => p.id)]).size;
    const isLoadingAudience = loadingContacts || loadingGroups || loadingParticipants;

    const isAccountConnected = (status?: WhatsappAccountStatus) => {
        if(!status) return false;
        return status.status === 'connected' || status.status === 'authorized';
    }
    
    return (
        <div className="flex flex-col gap-6">
            <SendProgressDialog open={sendProgress.isSending} state={sendProgress} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                 <Card className="h-full lg:col-span-1">
                     <CardHeader>
                        <CardTitle className="font-bold">الحسابات المرسلة</CardTitle>
                        <CardDescription>اختر الحساب الذي تريد الإرسال منه.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ScrollArea className="w-full" ref={accountsContainerRef}>
                            <div className="flex gap-4 pb-4">
                                {loadingAccounts ? (
                                    [...Array(2)].map((_, i) => <Skeleton key={i} className="w-64 h-32 shrink-0" />)
                                ) : (
                                    accounts.map(acc => (
                                        <AccountCard key={acc.id} account={acc} onClick={() => isAccountConnected(acc.status) && handleAccountSelection(acc.id)} isSelected={selectedAccount === acc.id} />
                                    ))
                                )}
                            </div>
                            <ScrollBar orientation="horizontal" />
                         </ScrollArea>
                    </CardContent>
                </Card>
                 <Card className="h-full lg:col-span-2">
                    <CardHeader>
                         <div className="flex items-center justify-between">
                            <CardTitle className="font-bold">تقارير الحملات</CardTitle>
                             <div className="flex items-center gap-2">
                                <AddParticipantToGroupsDialog accountId={selectedAccount} groups={groups.filter(g => g.iAmAdmin)} />
                                <Button variant="outline" className="justify-center"><History className="me-2 h-4 w-4"/> سجل الحملات</Button>
                                <CampaignSettingsDialog onSaveSuccess={fetchAccounts} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <StatCard icon={Users} title="إلى المجموعات" value={selectedGroups.length} />
                         <StatCard icon={UserCheck} title="إلى جهات الاتصال" value={selectedContacts.length + selectedParticipants.length} />
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 items-start">
                {selectedAccount ? (
                    <AudienceSelector
                        contacts={contacts}
                        groups={groups}
                        groupParticipants={groupParticipants}
                        onSelectedContactsChange={setSelectedContacts}
                        onSelectedGroupsChange={setSelectedGroups}
                        onSelectedParticipantsChange={setSelectedParticipants}
                        isLoading={isLoadingAudience}
                        accountId={selectedAccount}
                    />
                ) : (
                    <Card className="h-full flex items-center justify-center text-center">
                        <CardContent className="pt-6">
                            <p className="font-bold">الرجاء اختيار حساب واتساب متصل للمتابعة.</p>
                        </CardContent>
                    </Card>
                )}
                 <MessageComposer
                    message={message}
                    onMessageChange={setMessage}
                    attachment={attachment}
                    onAttachmentChange={setAttachment}
                    footerActions={
                        <Button size="lg" onClick={handleSend} disabled={sendProgress.isSending || !message || totalRecipients === 0} className="w-full">
                            {sendProgress.isSending ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Send className="me-2 h-5 w-5"/>}
                            إرسال إلى ({totalRecipients})
                        </Button>
                    }
                />
            </div>
        </div>
    );
}
