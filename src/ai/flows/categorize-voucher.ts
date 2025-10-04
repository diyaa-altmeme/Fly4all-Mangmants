'use server';

/**
 * @fileOverview An AI agent that categorizes vouchers by suggesting expense categories or general ledger accounts.
 *
 * - categorizeVoucher - A function that handles the voucher categorization process.
 * - CategorizeVoucherInput - The input type for the categorizeVoucher function.
 * - CategorizeVoucherOutput - The return type for the categorizeVoucher function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeVoucherInputSchema = z.object({
  voucherDescription: z
    .string()
    .describe('The description of the voucher, including details of the transaction.'),
});
export type CategorizeVoucherInput = z.infer<typeof CategorizeVoucherInputSchema>;

const CategorizeVoucherOutputSchema = z.object({
  suggestedCategory: z
    .string()
    .describe('The suggested expense category or general ledger account for the voucher.'),
  confidenceScore: z
    .number()
    .describe('A score between 0 and 1 indicating the confidence level of the suggestion.'),
});
export type CategorizeVoucherOutput = z.infer<typeof CategorizeVoucherOutputSchema>;

export async function categorizeVoucher(input: CategorizeVoucherInput): Promise<CategorizeVoucherOutput> {
  return categorizeVoucherFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeVoucherPrompt',
  input: {schema: CategorizeVoucherInputSchema},
  output: {schema: CategorizeVoucherOutputSchema},
  prompt: `You are an expert accounting assistant. Given the description of a voucher, you will suggest an appropriate expense category or general ledger account. You will also provide a confidence score between 0 and 1 indicating how confident you are in the suggestion.

Voucher Description: {{{voucherDescription}}}
`,
});

const categorizeVoucherFlow = ai.defineFlow(
  {
    name: 'categorizeVoucherFlow',
    inputSchema: CategorizeVoucherInputSchema,
    outputSchema: CategorizeVoucherOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
