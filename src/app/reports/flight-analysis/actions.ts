

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { FlightReport, BookingEntry, DataAuditIssue } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { addDays, format, isAfter, isBefore, parse } from 'date-fns';

const processDoc = (doc: FirebaseFirestore.DocumentSnapshot): any => {
    const data = doc.data() as any;
    if (!data) return null;
    const safeData = { ...data, id: doc.id };
    for (const key in safeData) {
        if (safeData[key] && typeof safeData[key].toDate === 'function') {
            safeData[key] = safeData[key].toDate().toISOString();
        }
    }
    return safeData;
};

export async function getFlightReports(): Promise<FlightReport[]> {
    try {
        const db = await getDb();
        if (!db) return [];
        const snapshot = await db.collection('flight_reports').orderBy('flightDate', 'desc').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlightReport));
    } catch (error) {
        console.error("Error getting flight reports: ", String(error));
        return [];
    }
}

export async function deleteFlightReport(id: string): Promise<{ success: boolean, error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection('flight_reports').doc(id).delete();
        revalidatePath('/reports/flight-analysis');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete report." };
    }
}


export async function runAdvancedFlightAudit(): Promise<Partial<FlightReport>[]> {
    const db = await getDb();
    if (!db) return [];

    const bookingsSnapshot = await db.collection('bookings').get();
    const bookings = bookingsSnapshot.docs.map(doc => processDoc(doc) as BookingEntry);

    const issues: DataAuditIssue[] = [];
    const pnrMap: { [key: string]: BookingEntry[] } = {};
    const ticketNumberMap: { [key: string]: BookingEntry[] } = {};

    for (const booking of bookings) {
        // Group by PNR
        if (booking.pnr) {
            if (!pnrMap[booking.pnr]) pnrMap[booking.pnr] = [];
            pnrMap[booking.pnr].push(booking);
        }
        
        // Group by ticket number for cross-PNR checks
        for (const passenger of booking.passengers) {
            if (passenger.ticketNumber) {
                 if (!ticketNumberMap[passenger.ticketNumber]) ticketNumberMap[passenger.ticketNumber] = [];
                 ticketNumberMap[passenger.ticketNumber].push(booking);
            }
        }
    }
    
    const duplicatePnrIssues: DataAuditIssue[] = Object.entries(pnrMap)
        .filter(([pnr, pnrBookings]) => pnrBookings.length > 1)
        .map(([pnr, pnrBookings]) => ({
            id: `pnr-${pnr}`,
            type: 'DUPLICATE_PNR',
            pnr: pnr,
            description: `تم العثور على ${pnrBookings.length} حجوزات بنفس رقم PNR. أرقام الفواتير: ${pnrBookings.map(b => b.invoiceNumber).join(', ')}`,
            link: `/bookings?search=${pnr}&searchField=pnr`,
            details: pnrBookings.map(b => ({ id: b.id, invoice: b.invoiceNumber }))
        }));
        
    const tripAnalysisIssues: DataAuditIssue[] = [];
    Object.values(pnrMap).forEach(pnrBookings => {
        const passengerTrips: { [name: string]: { count: number, dates: Date[] } } = {};
        pnrBookings.forEach(booking => {
            booking.passengers.forEach(p => {
                const nameKey = p.name.toLowerCase().trim();
                if (!passengerTrips[nameKey]) {
                    passengerTrips[nameKey] = { count: 0, dates: [] };
                }
                passengerTrips[nameKey].count++;
                if (booking.travelDate) {
                     passengerTrips[nameKey].dates.push(parse(booking.travelDate, 'yyyy-MM-dd', new Date()));
                }
            });
        });
        
        Object.entries(passengerTrips).forEach(([name, tripData]) => {
            if (tripData.count > 1) { // Potential round trip
                const sortedDates = tripData.dates.sort((a,b) => a.getTime() - b.getTime());
                const daysBetween = (sortedDates[1].getTime() - sortedDates[0].getTime()) / (1000 * 3600 * 24);
                if (daysBetween > 90) { // Arbitrary threshold
                    tripAnalysisIssues.push({
                         id: `return-${pnrBookings[0].pnr}-${name}`,
                         type: 'UNMATCHED_RETURN',
                         pnr: pnrBookings[0].pnr,
                         description: `المسافر ${name} لديه رحلة عودة بفارق ${daysBetween} يوم، قد تكون رحلة منفصلة.`,
                         link: `/bookings?search=${pnrBookings[0].pnr}&searchField=pnr`,
                    })
                }
            }
        })
    });
    
    const fileAnalysisIssues: DataAuditIssue[] = []; // Placeholder
    const dataIntegrityIssues: DataAuditIssue[] = []; // Placeholder

    // This is a simplified report structure just for the issues.
    return [{
        id: 'advanced_audit_report',
        fileName: 'Advanced System-Wide Audit',
        flightDate: format(new Date(), 'yyyy-MM-dd'),
        issues: {
            tripAnalysis: tripAnalysisIssues,
            duplicatePnr: duplicatePnrIssues,
            fileAnalysis: fileAnalysisIssues,
            dataIntegrity: dataIntegrityIssues,
        },
    }];
}

