
'use server';

/**
 * @fileOverview Flow for generating and sending an OTP via WhatsApp.
 */

import { z } from 'zod';
import { getDb } from '@/lib/firebase-admin';
import { getWhatsappAccounts, getAccountCredentials } from '@/app/campaigns/actions';

// We separate the actual Genkit flow logic to be dynamically imported
async function runSendOtpFlow({ phone }: { phone: string }) {
    const { ai } = await import('@/ai/genkit');
    const db = await getDb();
    if (!db) {
        throw new Error('Database not available');
    }

    // 1. Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 2. Store OTP in Firestore
    await db.collection('otp_requests').doc(phone).set({
        otp,
        expiresAt,
        verified: false,
    });

    // 3. Send OTP via WhatsApp using ultramsg
    const { accounts } = await getWhatsappAccounts();
    const defaultAccount = accounts?.find(a => a.isDefault && a.provider === 'ultramsg');

    if (!defaultAccount) {
        console.error("No default ultramsg account found for sending OTP.");
        return { success: false, message: 'WhatsApp service not configured.' };
    }
    
    const creds = await getAccountCredentials(defaultAccount.id);
    if (!creds || !creds.idInstance || !creds.apiTokenInstance) {
        return { success: false, message: "WhatsApp credentials not found or incomplete." };
    }

    try {
        const message = `رمز التحقق الخاص بك هو: ${otp}`;
        const url = `https://api.ultramsg.com/${creds.idInstance}/messages/chat`;
        
        const params = new URLSearchParams({
            token: creds.apiTokenInstance,
            to: phone,
            body: message,
            priority: '10'
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const responseData = await response.json();
        if (responseData.sent === 'true') {
            return { success: true, message: 'OTP sent successfully.' };
        } else {
            throw new Error(responseData.error?.message || 'Failed to send WhatsApp message via ultramsg.');
        }

    } catch (error: any) {
        console.error('Error sending OTP via ultramsg:', error);
        return { success: false, message: error.message || 'Failed to send OTP.' };
    }
}

const SendOtpInputSchema = z.object({
  phone: z.string().describe('The user\'s phone number, including country code.'),
});

const SendOtpOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type SendOtpInput = z.infer<typeof SendOtpInputSchema>;
export type SendOtpOutput = z.infer<typeof SendOtpOutputSchema>;

// This is the public function that will be imported by server actions.
// It dynamically imports the actual flow runner.
export async function sendOtp(input: SendOtpInput): Promise<SendOtpOutput> {
  return runSendOtpFlow(input);
}
