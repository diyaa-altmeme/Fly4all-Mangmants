
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { WhatsappAccount, WhatsappContact, WhatsappGroup, WhatsappGroupParticipant, WhatsappAccountStatus } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';

const ACCOUNTS_COLLECTION = 'whatsapp_accounts';
const ULTRAMSG_API_URL = 'https://api.ultramsg.com';
const GREENAPI_API_URL = 'https://api.green-api.com';


// CRUD for WhatsApp Accounts
export async function getWhatsappAccounts(): Promise<{ success: boolean; accounts?: WhatsappAccount[]; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        const snapshot = await db.collection(ACCOUNTS_COLLECTION).orderBy('name').get();
        const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsappAccount));
        return { success: true, accounts };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addWhatsappAccount(data: Omit<WhatsappAccount, 'id'>): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection(ACCOUNTS_COLLECTION).add(data);
        revalidatePath('/campaigns');
        revalidatePath('/settings');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateWhatsappAccount(id: string, data: Partial<Omit<WhatsappAccount, 'id'>>): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection(ACCOUNTS_COLLECTION).doc(id).update(data);
        revalidatePath('/campaigns');
        revalidatePath('/settings');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteWhatsappAccount(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection(ACCOUNTS_COLLECTION).doc(id).delete();
        revalidatePath('/campaigns');
        revalidatePath('/settings');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export const getAccountCredentials = cache(async (accountId: string): Promise<WhatsappAccount | null> => {
    const db = await getDb();
    if (!db) return null;
    const doc = await db.collection(ACCOUNTS_COLLECTION).doc(accountId).get();
    if (!doc.exists) return null;
    return doc.data() as WhatsappAccount;
});


export async function getWhatsappGroups(accountId: string): Promise<WhatsappGroup[]> {
    const creds = await getAccountCredentials(accountId);
    if (!creds || !creds.idInstance || !creds.apiTokenInstance) throw new Error("Account credentials not found or incomplete.");
    
    // As requested, only use ultramsg for fetching groups.
    try {
        const url = new URL(`${ULTRAMSG_API_URL}/${creds.idInstance}/groups`);
        url.searchParams.append('token', creds.apiTokenInstance);

        const response = await fetch(url.toString());
        const responseData = await response.json();

        if (!response.ok) {
             throw new Error(responseData.error || 'Failed to fetch WhatsApp groups from ultramsg.');
        }

        if (responseData && Array.isArray(responseData)) {
            return responseData.map((group: any) => ({
                id: group.id,
                name: group.name,
                participantsCount: group.groupMetadata?.participants?.length || 0,
                iAmAdmin: group.i_am_admin || false,
            }));
        }
        return [];
    } catch (error: any) {
        console.error("Error fetching WhatsApp groups from ultramsg:", error.message);
        throw new Error(error.message || 'Failed to fetch WhatsApp groups.');
    }
}

export async function getWhatsappContacts(accountId: string): Promise<WhatsappContact[]> {
     const creds = await getAccountCredentials(accountId);
    if (!creds || !creds.idInstance || !creds.apiTokenInstance) throw new Error("Account credentials not found or incomplete.");
    
    if (creds.provider === 'green-api') {
        const url = `${GREENAPI_API_URL}/waInstance${creds.idInstance}/getContacts/${creds.apiTokenInstance}`;
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch Green-API contacts: ${errorText}`);
        }
        const data = await response.json();
        return (data || []).map((contact: any) => ({
            id: contact.id,
            name: contact.name,
        }));
    }

    // Default to ultramsg
    try {
        const url = new URL(`${ULTRAMSG_API_URL}/${creds.idInstance}/contacts`);
        url.searchParams.append('token', creds.apiTokenInstance);
        
        const response = await fetch(url.toString());
        const responseData = await response.json();

        if (!response.ok) {
             throw new Error(responseData.error || 'Failed to fetch WhatsApp contacts.');
        }
        
        if (responseData && Array.isArray(responseData)) {
            return responseData.map((contact: any) => ({
                id: contact.id,
                name: contact.name,
            }));
        }
        return [];
    } catch (error: any) {
        console.error("Error fetching WhatsApp contacts:", error.message);
        throw new Error(error.message || 'Failed to fetch WhatsApp contacts.');
    }
}

export async function getWhatsappGroupParticipants(accountId: string, groupId: string): Promise<WhatsappGroupParticipant[]> {
    const creds = await getAccountCredentials(accountId);
    if (!creds || !creds.idInstance || !creds.apiTokenInstance) throw new Error("Account credentials not found or incomplete.");
    
    if (creds.provider === 'green-api') {
        const url = `${GREENAPI_API_URL}/waInstance${creds.idInstance}/getGroupParticipants/${creds.apiTokenInstance}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ groupId })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch Green-API group participants: ${errorText}`);
        }
        const data = await response.json();
        return (data?.participants || []).map((p: any) => ({ id: p.id, name: p.name || p.id.split('@')[0] }));
    }

    // Default to ultramsg
    try {
        const url = new URL(`${ULTRAMSG_API_URL}/${creds.idInstance}/groups/participants`);
        url.searchParams.append('token', creds.apiTokenInstance);
        url.searchParams.append('groupId', groupId);
        
        const response = await fetch(url.toString());
        const responseData = await response.json();
        
        if (!response.ok) {
             throw new Error(responseData.error || 'Failed to fetch group participants.');
        }

        if (responseData && Array.isArray(responseData)) {
            return responseData.map((participant: any) => ({
                id: participant.id,
                name: participant.name,
            }));
        }
        return [];
    } catch (error: any) {
        console.error(`Error fetching participants for group ${groupId}:`, error.message);
        throw new Error(error.message || 'Failed to fetch group participants.');
    }
}

export async function addWhatsappGroupParticipant(accountId: string, groupId: string, participantChatId: string): Promise<{ success: boolean, error?: string, message?: string }> {
    const creds = await getAccountCredentials(accountId);
    if (!creds || !creds.idInstance || !creds.apiTokenInstance || creds.provider !== 'green-api') {
        return { success: false, error: "This function is only for Green-API accounts and requires full credentials." };
    }

    try {
        const url = `${GREENAPI_API_URL}/waInstance${creds.idInstance}/addGroupParticipant/${creds.apiTokenInstance}`;
        const payload = {
            groupId,
            participantChatId,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const responseData = await response.json();

        if (response.ok && responseData.add) {
            return { success: true, message: `Successfully added participant to group.` };
        } else {
            return { success: false, error: responseData.message || 'Failed to add participant.' };
        }
    } catch (error: any) {
        console.error("Error adding participant to group:", error.message);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}


export async function getWhatsappAccountStatus(accountId: string): Promise<WhatsappAccountStatus> {
    const creds = await getAccountCredentials(accountId);
    if (!creds || !creds.idInstance || !creds.apiTokenInstance) {
        return { status: 'error', message: 'Incomplete credentials.' };
    }
    
    if (creds.provider === 'green-api') {
        try {
            const stateUrl = `${GREENAPI_API_URL}/waInstance${creds.idInstance}/getStateInstance/${creds.apiTokenInstance}`;
            const stateResponse = await fetch(stateUrl);

            if (!stateResponse.ok) {
                 try {
                    const errorJson = await stateResponse.json();
                     return { status: 'error', message: errorJson.message || 'Failed to fetch Green-API status' };
                } catch(e) {
                     return { status: 'error', message: await stateResponse.text() || 'Failed to fetch Green-API status' };
                }
            }
            
            const stateData = await stateResponse.json();
            const baseStatus: Partial<WhatsappAccountStatus> = {
                 status: stateData.stateInstance,
                 message: stateData.stateInstance === 'authorized' ? 'متصل' : 'غير متصل',
            };

            if (stateData.stateInstance === 'notAuthorized') {
                try {
                    const qrUrl = `${GREENAPI_API_URL}/waInstance${creds.idInstance}/qr/${creds.apiTokenInstance}`;
                    const qrResponse = await fetch(qrUrl);
                     if (qrResponse.ok) {
                        const qrData = await qrResponse.json();
                        if (qrData.type === 'qrCode') {
                            baseStatus.status = 'got qr code';
                            baseStatus.qrCode = qrData.message;
                        }
                    }

                } catch (e) {
                     console.warn("Could not fetch QR code for Green-API, continuing without it.", e);
                }
            }

            if (stateData.stateInstance === 'authorized') {
                try {
                    const settingsUrl = `${GREENAPI_API_URL}/waInstance${creds.idInstance}/getWaSettings/${creds.apiTokenInstance}`;
                    const settingsResponse = await fetch(settingsUrl);
                    if(settingsResponse.ok) {
                        const settingsData = await settingsResponse.json();
                        const wid = settingsData.wid;
                        if(wid) {
                            baseStatus.name = settingsData.pushname || wid.split('@')[0];
                            const avatarUrl = `${GREENAPI_API_URL}/waInstance${creds.idInstance}/getAvatar/${creds.apiTokenInstance}`;
                            const avatarResponse = await fetch(avatarUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ chatId: wid })
                            });
                            if (avatarResponse.ok) {
                                const avatarData = await avatarResponse.json();
                                if (avatarData.existsAvatar) {
                                    baseStatus.profile_picture = avatarData.urlAvatar;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch avatar/settings for Green-API, continuing without it.", e);
                }
            }
            
            return baseStatus as WhatsappAccountStatus;

        } catch(e: any) {
            return { status: 'error', message: e.message || "Failed to fetch Green-API status." };
        }
    }

    // Default to ultramsg
    try {
        const meUrl = new URL(`${ULTRAMSG_API_URL}/${creds.idInstance}/instance/me`);
        meUrl.searchParams.append('token', creds.apiTokenInstance);
        const meResponse = await fetch(meUrl.toString());

        if (!meResponse.ok) {
            const errorData = await meResponse.json();
            return { status: 'error', message: errorData.error || 'Failed to fetch account details.' };
        }
        
        const meData = await meResponse.json();
        
        const statusResponse = await fetch(`${ULTRAMSG_API_URL}/${creds.idInstance}/instance/status?token=${creds.apiTokenInstance}`);
        const statusData = await statusResponse.json();

        if (statusData?.status?.account_status?.status === 'got qr code' && statusData.status.qrCode) {
             return {
                ...statusData.status.account_status,
                status: 'got qr code',
                qrCode: statusData.status.qrCode
             }
        }
        
        return {
            status: 'connected',
            message: 'متصل',
            name: meData.name,
            profile_picture: meData.image,
        };

    } catch (error: any) {
         console.error(`Error fetching status for account ${accountId}:`, error.message);
        return { status: 'error', message: error.message || 'Unknown error.' };
    }
}
