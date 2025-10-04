
import { z } from "zod";
import type { BookingEntry, Passenger as PassengerType } from "@/lib/types";


// This file can be used for client-side validation schemas if needed,
// but the primary source of truth for types is now src/lib/types.ts

// Example client-side schema if you were using something like tanstack-table
export const passengerSchema = z.object({
  id: z.string(),
  name: z.string(),
  passportNumber: z.string(),
  ticketNumber: z.string(),
  purchasePrice: z.number(),
  salePrice: z.number(),
  passengerType: z.enum(['Adult', 'Child', 'Infant']),
  ticketType: z.enum(['Issue', 'Change', 'Refund']),
  currency: z.enum(['USD', 'IQD']),
});


export const bookingSchema = z.object({
  id: z.string(),
  pnr: z.string(),
  supplierId: z.string(),
  clientId: z.string(),
  boxId: z.string(),
  isEntered: z.boolean(),
  isAudited: z.boolean(),
  issueDate: z.string(), // Assuming string format for simplicity here
  travelDate: z.string(),
  route: z.string(),
  notes: z.string(),
  passengers: z.array(passengerSchema),
});


export type Booking = z.infer<typeof bookingSchema>;
export type Passenger = z.infer<typeof passengerSchema>;
