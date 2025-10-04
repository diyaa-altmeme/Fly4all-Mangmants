
'use server';
/**
 * @fileOverview Flow for extracting ticket data from a PDF file.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PassengerSchema = z.object({
    name: z.string().describe('Full name of the passenger.'),
    ticketNumber: z.string().describe('The ticket number for the passenger.'),
    passportNumber: z.string().optional().describe('The passport number of the passenger.'),
    passengerType: z.enum(['Adult', 'Child', 'Infant']).describe('Type of passenger (Adult, Child, or Infant).'),
    ticketType: z.enum(['Issue', 'Change', 'Refund']).default('Issue').describe('The type of ticket transaction.'),
});

const ExtractTicketDataInputSchema = z.object({
  fileDataUri: z.string().describe("A PDF file of a flight ticket, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
});

const ExtractTicketDataOutputSchema = z.object({
  pnr: z.string().describe('The PNR (Passenger Name Record) or booking reference of the ticket.'),
  route: z.string().describe('The flight route, like "BGW-DXB".'),
  airline: z.string().describe('The airline operating the flight.'),
  airlineIataCode: z.string().length(2).optional().describe('The two-letter IATA code for the airline (e.g., "FZ" for Fly Dubai). Only return if a valid 2-letter code is found.'),
  airlineLogoUrl: z.string().optional().describe('The URL for the airline logo, constructed from its IATA code. Only return if a valid IATA code is found.'),
  issueDate: z.string().describe('The issue date of the ticket in YYYY-MM-DD format.'),
  travelDate: z.string().describe('The travel date of the first flight segment in YYYY-MM-DD format.'),
  passengers: z.array(PassengerSchema).describe('An array of all passengers on this ticket.'),
});

export type ExtractTicketDataInput = z.infer<typeof ExtractTicketDataInputSchema>;
export type ExtractTicketDataOutput = z.infer<typeof ExtractTicketDataOutputSchema>;


export async function extractTicketData(input: ExtractTicketDataInput): Promise<ExtractTicketDataOutput> {
  return extractTicketDataFlow(input);
}


const prompt = ai.definePrompt({
    name: 'extractTicketDataPrompt',
    input: { schema: ExtractTicketDataInputSchema },
    output: { schema: ExtractTicketDataOutputSchema },
    prompt: `You are an expert travel agent assistant. Your task is to extract structured data from a flight ticket PDF.

    Analyze the provided flight ticket file and extract the following information:
    - PNR (Passenger Name Record) or Booking Reference. This is a crucial 6-character alphanumeric code. Look for labels like "Booking Reference", "PNR", "الحجز", or "مرجع الحجز". Be very precise and extract only the single, correct PNR.
    - The flight route, formatted as "FROM-TO" (e.g., "BGW-DXB").
    - The name of the airline.
    - The two-letter IATA code for the airline (e.g., "EK" for Emirates, "FZ" for Fly Dubai, "QR" for Qatar Airways). If you cannot determine the IATA code, do not include the 'airlineIataCode' or 'airlineLogoUrl' fields in the output.
    - The issue date of the ticket in YYYY-MM-DD format.
    - The travel date of the first flight segment in YYYY-MM-DD format.
    - A list of all passengers, including their full name, ticket number, passport number (if available), and passenger type (Adult, Child, or Infant).

    If, and only if, you extract a valid two-letter IATA code, you MUST construct the airlineLogoUrl using this exact format: \`https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/IATA_CODE.svg\`, replacing IATA_CODE with the extracted two-letter code.

    Return the data in the specified JSON format.

    Ticket File: {{media url=fileDataUri}}
    `,
});

const extractTicketDataFlow = ai.defineFlow(
  {
    name: 'extractTicketDataFlow',
    inputSchema: ExtractTicketDataInputSchema,
    outputSchema: ExtractTicketDataOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("Failed to extract data from ticket.");
    }
    return output;
  }
);
