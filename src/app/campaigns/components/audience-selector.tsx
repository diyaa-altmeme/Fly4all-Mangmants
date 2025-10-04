
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Smartphone, Users, UserCheck, Loader2 } from 'lucide-react';
import type { WhatsappAccount, WhatsappContact, WhatsappGroup, WhatsappGroupParticipant } from '@/lib/types';
import { CampaignAudienceTable, contactColumns, groupColumns, groupParticipantColumns } from './campaign-audience-table';

interface AudienceSelectorProps {
    contacts: WhatsappContact[];
    groups: WhatsappGroup[];
    groupParticipants: WhatsappGroupParticipant[];
    onSelectedContactsChange: (contacts: WhatsappContact[]) => void;
    onSelectedGroupsChange: (groups: WhatsappGroup[]) => void;
    onSelectedParticipantsChange: (participants: WhatsappGroupParticipant[]) => void;
    isLoading: boolean;
    accountId: string;
}

export default function AudienceSelector({
    contacts,
    groups,
    groupParticipants,
    onSelectedContactsChange,
    onSelectedGroupsChange,
    onSelectedParticipantsChange,
    isLoading,
    accountId,
}: AudienceSelectorProps) {

    return (
        <Card className="h-full">
            <CardContent className="space-y-4 pt-6">
                <Tabs defaultValue="contacts">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="contacts"><Smartphone className="me-2 h-4 w-4"/>جهات الاتصال</TabsTrigger>
                        <TabsTrigger value="groups"><Users className="me-2 h-4 w-4"/>المجموعات</TabsTrigger>
                        <TabsTrigger value="participants"><UserCheck className="me-2 h-4 w-4"/>أعضاء المجموعات</TabsTrigger>
                    </TabsList>
                    <TabsContent value="contacts" className="mt-4">
                        {isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <CampaignAudienceTable
                                columns={contactColumns}
                                data={contacts}
                                onSelectionChange={onSelectedContactsChange}
                                searchColumn="name"
                            />
                        )}
                    </TabsContent>
                        <TabsContent value="groups" className="mt-4">
                            {isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <CampaignAudienceTable
                                columns={groupColumns}
                                data={groups}
                                onSelectionChange={onSelectedGroupsChange}
                                searchColumn="name"
                                accountId={accountId}
                                contacts={contacts}
                            />
                        )}
                    </TabsContent>
                    <TabsContent value="participants" className="mt-4">
                        {isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <CampaignAudienceTable
                                columns={groupParticipantColumns}
                                data={groupParticipants}
                                onSelectionChange={onSelectedParticipantsChange}
                                searchColumn="name"
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
