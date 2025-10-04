
'use server';

/**
 * @fileOverview Flow for generating and sending an installment reminder via WhatsApp.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getWhatsappAccounts, getAccountCredentials } from '@/app/campaigns/actions';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

const SendInstallmentReminderInputSchema = z.object({
  clientName: z.string().describe("The client's name."),
  clientPhone: z.string().describe("The client's phone number."),
  serviceName: z.string().describe("The name of the subscribed service."),
  amountDue: z.coerce.number().describe("The amount due for the installment."),
  currency: z.string().describe("The currency of the amount."),
  dueDate: z.string().describe("The due date of the installment in ISO format."),
});

const SendInstallmentReminderOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type SendInstallmentReminderInput = z.infer<typeof SendInstallmentReminderInputSchema>;
export type SendInstallmentReminderOutput = z.infer<typeof SendInstallmentReminderOutputSchema>;

export async function sendInstallmentReminder(input: SendInstallmentReminderInput): Promise<SendInstallmentReminderOutput> {
  return sendInstallmentReminderFlow(input);
}

const sendInstallmentReminderFlow = ai.defineFlow(
  {
    name: 'sendInstallmentReminderFlow',
    inputSchema: SendInstallmentReminderInputSchema,
    outputSchema: SendInstallmentReminderOutputSchema,
  },
  async (input) => {
    // 1. Get default WhatsApp account
    const { accounts } = await getWhatsappAccounts();
    const defaultAccount = accounts?.find(a => a.isDefault);

    if (!defaultAccount) {
      console.error("No default WhatsApp account found for sending reminders.");
      return { success: false, message: 'WhatsApp service not configured.' };
    }
    
    const creds = await getAccountCredentials(defaultAccount.id);
     if (!creds || !creds.idInstance || !creds.apiTokenInstance) {
        return { success: false, message: "WhatsApp credentials not found or incomplete." };
    }
    
    // 2. Format the message
    const formattedDueDate = format(parseISO(input.dueDate), 'd MMMM yyyy', { locale: ar });
    const formattedAmount = `${input.amountDue.toLocaleString()} ${input.currency}`;

    const message = `
مرحباً ${input.clientName}،

نود تذكيركم بموعد استحقاق القسط الخاص باشتراككم في خدمة "${input.serviceName}".

- المبلغ المستحق: *${formattedAmount}*
- تاريخ الاستحقاق: *${formattedDueDate}*

يرجى التفضل بالسداد في الوقت المحدد لتجنب أي انقطاع في الخدمة.

مع تحياتنا،
فريق الروضتين
`;

    // 3. Send message via the appropriate provider
    try {
      const url = `https://api.ultramsg.com/${creds.idInstance}/messages/chat`;
      const params = new URLSearchParams({
        token: creds.apiTokenInstance,
        to: input.clientPhone,
        body: message,
        priority: '1',
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const responseData = await response.json();
      if (responseData.sent === 'true') {
        return { success: true, message: 'Reminder sent successfully.' };
      } else {
        throw new Error(responseData.error?.message || 'Failed to send WhatsApp message via ultramsg.');
      }
    } catch (error: any) {
      console.error('Error sending reminder via ultramsg:', error);
      return { success: false, message: error.message || 'Failed to send reminder.' };
    }
  }
);
