
'use server';

/**
 * @fileOverview An AI agent that analyzes remittance text messages and extracts structured data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeRemittanceInputSchema = z.object({
  messageText: z.string().describe('The remittance message text, as written in a chat app like WhatsApp.'),
});
export type AnalyzeRemittanceInput = z.infer<typeof AnalyzeRemittanceInputSchema>;

const AnalyzeRemittanceOutputSchema = z.object({
  companyName: z.string().describe('The name of the sending company or person.'),
  amount: z.coerce.number().describe('The numerical amount of the remittance. This should be a number, not a string.'),
  currency: z.enum(['dinar', 'dollar']).describe('The currency of the remittance, either "dinar" or "dollar".'),
  method: z.string().describe('The transfer method (e.g., Master, Al-Taif, Zain Cash).'),
  recipient: z.string().optional().describe('The intended recipient of the funds (e.g., Fly, merchant, exchange).'),
  notes: z.string().optional().describe('Any additional notes, divisions, or clarifying details.'),
});
export type AnalyzeRemittanceOutput = z.infer<typeof AnalyzeRemittanceOutputSchema>;

export async function analyzeRemittanceText(input: AnalyzeRemittanceInput): Promise<AnalyzeRemittanceOutput> {
  return analyzeRemittanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeRemittancePrompt',
  input: { schema: AnalyzeRemittanceInputSchema },
  output: { schema: AnalyzeRemittanceOutputSchema },
  prompt: `You are an expert financial assistant specializing in analyzing remittance messages from Iraqi travel agencies. Your task is to extract structured data from the following text message. The message is written in Arabic, often using colloquialisms.

Analyze the message and extract the following fields:
- companyName: The name of the sending company.
- amount: The numeric value of the money transferred. Convert textual numbers (like "مليون") to digits. Ignore commas.
- currency: Determine if the amount is in "dinar" or "dollar". If a number like "720" or "720,000" is mentioned with an equivalent like "600", assume the larger number is dinar and it's equivalent to the smaller number in dollars. The amount field should contain the primary value mentioned.
- method: The transfer method (e.g., "ماستر", "الطيف", "زين كاش", "بورصة").
- recipient: The entity the money is being transferred to (e.g., "فلاي", "تاجر", "بورصة"). If not specified, leave it empty.
- notes: Any other information, like divisions, purposes, or notes. Include the equivalent dollar amount here if it exists.

Return the result as a structured JSON object.

Message:
{{{messageText}}}
`,
});

const analyzeRemittanceFlow = ai.defineFlow(
  {
    name: 'analyzeRemittanceFlow',
    inputSchema: AnalyzeRemittanceInputSchema,
    outputSchema: AnalyzeRemittanceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("Failed to analyze remittance text.");
    }
    return output;
  }
);
