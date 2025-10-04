

'use server';

import { getAccountCredentials } from "./actions";

const ULTRAMSG_API_URL = 'https://api.ultramsg.com';
const GREENAPI_API_URL = 'https://api.green-api.com';

interface SendMessagePayload {
  accountId: string;
  recipients: string[]; // Array of chat IDs (e.g., '1234567890@c.us' or '123-456@g.us')
  message: string;
  attachment?: {
    dataUri: string;
    filename: string;
  };
}

export type SendResult = {
    success: boolean;
    recipient: string;
    message?: string;
    error?: string;
}

const getMimeTypeFromDataUri = (dataUri: string): string => {
    return dataUri.substring(dataUri.indexOf(':') + 1, dataUri.indexOf(';'));
}

async function sendUltramsgMessage(creds: any, to: string, body: string, attachment?: any): Promise<SendResult> {
    try {
        let url;
        let payload: Record<string, string> = { token: creds.apiTokenInstance, to: to };

        if (attachment) {
            const mimeType = getMimeTypeFromDataUri(attachment.dataUri);
            if (mimeType.startsWith('image/')) {
                url = `${ULTRAMSG_API_URL}/${creds.idInstance}/messages/image`;
                payload = { ...payload, image: attachment.dataUri, caption: body };
            } else {
                url = `${ULTRAMSG_API_URL}/${creds.idInstance}/messages/document`;
                payload = { ...payload, document: attachment.dataUri, filename: attachment.filename, caption: body };
            }
        } else {
            url = `${ULTRAMSG_API_URL}/${creds.idInstance}/messages/chat`;
            payload = { ...payload, body: body, priority: "10" };
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(payload),
        });

        const data = await response.json();
        if (data.sent === 'true') {
            return { success: true, recipient: to, message: data.id };
        } else {
            return { success: false, recipient: to, error: data.error?.message || 'Unknown error' };
        }
    } catch (e: any) {
        return { success: false, recipient: to, error: e.message };
    }
}

async function sendGreenApiMessage(creds: any, to: string, body: string, attachment?: any): Promise<SendResult> {
     try {
        let url;
        let payload;

        if (attachment) {
            url = `${GREENAPI_API_URL}/waInstance${creds.idInstance}/sendFileByBase64/${creds.apiTokenInstance}`;
            payload = {
                chatId: to,
                fileName: attachment.filename,
                base64: attachment.dataUri.split(',')[1],
                caption: body,
            };
        } else {
            url = `${GREENAPI_API_URL}/waInstance${creds.idInstance}/sendMessage/${creds.apiTokenInstance}`;
             payload = {
                chatId: to,
                message: body,
            };
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (data.idMessage) {
            return { success: true, recipient: to, message: data.idMessage };
        } else {
            return { success: false, recipient: to, error: 'Failed to send message' };
        }
    } catch (e: any) {
        return { success: false, recipient: to, error: e.message };
    }
}


export async function sendWhatsappMessage(payload: SendMessagePayload): Promise<SendResult[]> {
    const creds = await getAccountCredentials(payload.accountId);
    if (!creds) {
        throw new Error("WhatsApp account not found or credentials incomplete.");
    }
    
    const sendFunction = creds.provider === 'green-api' ? sendGreenApiMessage : sendUltramsgMessage;

    const results: SendResult[] = [];

    // Use a for...of loop to handle async operations sequentially
    for (const recipient of payload.recipients) {
        const result = await sendFunction(creds, recipient, payload.message, payload.attachment);
        results.push(result);
        // Optional: add a small delay between messages to avoid being flagged as spam
        await new Promise(resolve => setTimeout(resolve, 500)); 
    }
    
    return results;
}
