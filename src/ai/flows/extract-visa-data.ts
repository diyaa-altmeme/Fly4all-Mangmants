
'use server';
/**
 * @fileOverview Flow for extracting visa data from a PDF file.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PassengerSchema = z.object({
    name: z.string().describe('Full name of the passenger as it appears on the passport.'),
    passportNumber: z.string().optional().describe('The passport number of the passenger.'),
});

const ExtractVisaDataInputSchema = z.object({
  fileDataUri: z.string().describe("A PDF file of a visa application or approval, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
});

const ExtractVisaDataOutputSchema = z.object({
  destination: z.string().describe('The destination country for the visa (e.g., "Turkey", "UAE", "Schengen").'),
  visaType: z.string().describe('The type of visa (e.g., "Tourist", "Work", "Student").'),
  applicationNumber: z.string().optional().describe('The visa application reference number, if available.'),
  passengers: z.array(PassengerSchema).describe('An array of all passengers on this visa application.'),
});

export type ExtractVisaDataInput = z.infer<typeof ExtractVisaDataInputSchema>;
export type ExtractVisaDataOutput = z.infer<typeof ExtractVisaDataOutputSchema>;


export async function extractVisaData(input: ExtractVisaDataInput): Promise<ExtractVisaDataOutput> {
  return extractVisaDataFlow(input);
}


const prompt = ai.definePrompt({
    name: 'extractVisaDataPrompt',
    input: { schema: ExtractVisaDataInputSchema },
    output: { schema: ExtractVisaDataOutputSchema },
    prompt: `You are an expert travel agent assistant specializing in visa processing. Your task is to extract structured data from a visa application PDF.

    Analyze the provided visa file and extract the following information:
    - The destination country for the visa.
    - The type or category of the visa.
    - The application number or reference, if present.
    - A list of all passengers, including their full name and passport number (if available).

    Return the data in the specified JSON format.

    Visa File: {{media url=fileDataUri}}
    `,
});

const extractVisaDataFlow = ai.defineFlow(
  {
    name: 'extractVisaDataFlow',
    inputSchema: ExtractVisaDataInputSchema,
    outputSchema: ExtractVisaDataOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("Failed to extract data from visa document.");
    }
    return output;
  }
);
