
'use server';

import { getDb, getStorageAdmin } from '@/lib/firebase-admin';
import type { FlightReport, DataAuditIssue, ManualDiscount } from '@/lib/types';
import { normalizeName } from '@/lib/utils';
import { cache } from 'react';
import { produce } from 'immer';
import { parseISO, isValid } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';


// Using cache to avoid re-fetching within the same request
export const getFlightReportsData = cache(async (): Promise<FlightReport[]> => {
    const db = await getDb();
    if (!db) return [];
    const snapshot = await db.collection('flight_reports').orderBy('flightDate', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlightReport));
});


// New dedicated function to find duplicate PNRs across different files
async function findDuplicatePnrsInReports(reports: FlightReport[]): Promise<Map<string, DataAuditIssue[]>> {
    const pnrOccurrences = new Map<string, { reportId: string; route: string; date: string; pnr: string; fileName: string; time: string, paxCount: number }[]>();

    // 1. Group all PNR occurrences
    reports.forEach(report => {
        (report.pnrGroups || []).forEach(pnrGroup => {
            const bookingReference = pnrGroup.bookingReference;
            if (!bookingReference) return;

            if (!pnrOccurrences.has(bookingReference)) {
                pnrOccurrences.set(bookingReference, []);
            }
            pnrOccurrences.get(bookingReference)!.push({
                reportId: report.id,
                route: report.route,
                date: report.flightDate,
                pnr: pnrGroup.pnr,
                fileName: report.fileName,
                time: report.flightTime,
                paxCount: pnrGroup.paxCount,
            });
        });
    });

    const issuesByReportId = new Map<string, DataAuditIssue[]>();

    // 2. Iterate through PNRs and check for duplicates across different flights
    for (const [bookingReference, occurrences] of pnrOccurrences.entries()) {
        if (occurrences.length > 1) {
            const uniqueFlights = new Set(occurrences.map(o => `${o.route}|${o.date}`));
            
            if (uniqueFlights.size > 1) {
                // This booking reference is on multiple different flights
                const flightDetails = Array.from(uniqueFlights).join(' و ');
                const issue: DataAuditIssue = {
                    id: `pnr-${bookingReference}`,
                    type: 'DUPLICATE_PNR',
                    pnr: bookingReference,
                    description: `تم العثور على مرجع الحجز في رحلات مختلفة: ${flightDetails}`,
                    details: occurrences.map(occ => ({
                        ...occ,
                        bookingReference: bookingReference // ensure it's passed down
                    })),
                    link: '#',
                };
                
                occurrences.forEach(occ => {
                    if (!issuesByReportId.has(occ.reportId)) {
                        issuesByReportId.set(occ.reportId, []);
                    }
                    // Avoid adding the same issue multiple times to the same report
                    if (!issuesByReportId.get(occ.reportId)!.some(i => i.id === issue.id)) {
                         issuesByReportId.get(occ.reportId)!.push(issue);
                    }
                });
            }
        }
    }
    return issuesByReportId;
}

// New function to detect fully duplicate files
async function findDuplicateFiles(reports: FlightReport[]): Promise<Map<string, DataAuditIssue[]>> {
    const fileFingerprintMap = new Map<string, { reportId: string; fileName: string; flightDate: string; flightTime: string; route: string; }[]>();
    
    reports.forEach(report => {
        // Create a 'fingerprint' for each report to identify it.
        const fingerprint = `${report.flightDate}|${report.flightTime}|${report.route}|${report.paxCount}|${(report.totalRevenue || 0).toFixed(2)}`;
        
        if (!fileFingerprintMap.has(fingerprint)) {
            fileFingerprintMap.set(fingerprint, []);
        }
        fileFingerprintMap.get(fingerprint)!.push({
            reportId: report.id,
            fileName: report.fileName,
            flightDate: report.flightDate,
            flightTime: report.flightTime,
            route: report.route,
        });
    });

    const issuesByReportId = new Map<string, DataAuditIssue[]>();
    for (const [fingerprint, occurrences] of fileFingerprintMap.entries()) {
        if (occurrences.length > 1) {
            const fileNames = occurrences.map(o => o.fileName).join(', ');
            const issue: DataAuditIssue = {
                id: `file-${fingerprint}`,
                type: 'DUPLICATE_FILE',
                description: `تم العثور على هذا الملف مكررًا في: ${fileNames}`,
                details: occurrences,
                link: '#',
            };
            
            occurrences.forEach(occ => {
                if (!issuesByReportId.has(occ.reportId)) {
                    issuesByReportId.set(occ.reportId, []);
                }
                issuesByReportId.get(occ.reportId)!.push(issue);
            });
        }
    }
    return issuesByReportId;
}

// Function to process a single report
const processSingleReport = (report: FlightReport, passengerTripMap: Map<string, any[]>, duplicatePnrIssues: DataAuditIssue[], fileAnalysisIssues: DataAuditIssue[]): FlightReport => {
    return produce(report, draftReport => {
        draftReport.issues = {
            tripAnalysis: [],
            duplicatePnr: duplicatePnrIssues,
            fileAnalysis: fileAnalysisIssues,
            dataIntegrity: []
        };
        draftReport.totalDiscount = 0;
        draftReport.tripTypeCounts = { oneWay: 0, roundTrip: 0 };


        const processedPassengersForTripCount = new Set<string>();

        (draftReport.passengers || []).forEach(passenger => {
            const uniqueKey = `${normalizeName(passenger.bookingReference)}|${normalizeName(passenger.name)}|${passenger.passportNumber || ''}`;
            const allTripsForPassengerOnPnr = passengerTripMap.get(uniqueKey) || [];
            
            const currentTripDateValue = draftReport.flightDate;
            const currentTripDate = typeof currentTripDateValue === 'string' ? parseISO(currentTripDateValue) : currentTripDateValue;

            if (allTripsForPassengerOnPnr.length > 1) {
                 if (!processedPassengersForTripCount.has(uniqueKey)) {
                    draftReport.tripTypeCounts.roundTrip += 1;
                    processedPassengersForTripCount.add(uniqueKey);
                }

                const currentTripInstance = allTripsForPassengerOnPnr.find(t => {
                    const tripDate = typeof t.date === 'string' ? parseISO(t.date) : t.date;
                    return t.reportId === draftReport.id && tripDate.getTime() === currentTripDate.getTime() && t.bookingReference === passenger.bookingReference;
                });

                if (currentTripInstance) {
                    const tripIndex = allTripsForPassengerOnPnr.indexOf(currentTripInstance);
                    
                    if (tripIndex === 0) {
                        passenger.tripType = 'DEPARTURE';
                        passenger.actualPrice = passenger.payable;
                    } else if (tripIndex > 0) {
                        passenger.tripType = 'RETURN';
                        passenger.actualPrice = 0;
                        passenger.departureDate = allTripsForPassengerOnPnr[0].date.toISOString();
                        draftReport.totalDiscount! += passenger.payable;
                    }
                } else {
                     passenger.tripType = 'SINGLE';
                     passenger.actualPrice = passenger.payable;
                }
                
                const issueExists = draftReport.issues!.tripAnalysis.some(issue => issue.id === `return-${uniqueKey}`);
                if (!issueExists) {
                    draftReport.issues!.tripAnalysis.push({
                        id: `return-${uniqueKey}`,
                        type: 'UNMATCHED_RETURN',
                        pnr: passenger.bookingReference,
                        description: `تم تحديد رحلة ذهاب وعودة للمسافر: ${passenger.name}`,
                        details: allTripsForPassengerOnPnr
                    });
                }
            } else {
                 if (!processedPassengersForTripCount.has(uniqueKey)) {
                    draftReport.tripTypeCounts.oneWay += 1;
                    processedPassengersForTripCount.add(uniqueKey);
                }
                passenger.tripType = 'SINGLE';
                passenger.actualPrice = passenger.payable;
            }
        });
        
        let manualDiscountValue = 0;
        if(draftReport.manualDiscount?.type === 'fixed') {
            manualDiscountValue = draftReport.manualDiscount.value || 0;
        } else if (draftReport.manualDiscount?.type === 'per_passenger') {
            const passengerCounts = (draftReport.passengers || []).reduce((acc, p) => {
                const type = p.passengerType || 'Adult';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {} as Record<'Adult' | 'Child' | 'Infant', number>);
            const adultDiscount = (passengerCounts.Adult || 0) * (draftReport.manualDiscount.perAdult || 0);
            const childDiscount = (passengerCounts.Child || 0) * (draftReport.manualDiscount.perChild || 0);
            const infantDiscount = (passengerCounts.Infant || 0) * (draftReport.manualDiscount.perInfant || 0);
            manualDiscountValue = adultDiscount + childDiscount + infantDiscount;
        }

        draftReport.manualDiscountValue = manualDiscountValue;
        draftReport.filteredRevenue = (draftReport.totalRevenue || 0) - (draftReport.totalDiscount || 0) - manualDiscountValue;
    });
};


export async function runAdvancedFlightAudit(): Promise<FlightReport[]> {
    const reports = await getFlightReportsData();
    if (reports.length === 0) return [];
    
    const [duplicatePnrIssuesByReportId, duplicateFileIssuesByReportId] = await Promise.all([
        findDuplicatePnrsInReports(reports),
        findDuplicateFiles(reports)
    ]);
    
    const passengerTripMap = new Map<string, { reportId: string; date: Date; route: string; pnr: string; bookingReference: string; payable: number; passengerName: string; time: string; fileName: string; }[]>();

    reports.forEach(report => {
        (report.pnrGroups || []).forEach(pnrGroup => {
            pnrGroup.passengers.forEach(p => {
                const uniqueKey = `${normalizeName(pnrGroup.bookingReference)}|${normalizeName(p.name)}|${p.passportNumber || ''}`;
                
                if (!passengerTripMap.has(uniqueKey)) {
                    passengerTripMap.set(uniqueKey, []);
                }
                const dateValue = report.flightDate instanceof Date ? report.flightDate : parseISO(report.flightDate);
                passengerTripMap.get(uniqueKey)!.push({
                    reportId: report.id,
                    date: dateValue,
                    route: report.route,
                    pnr: pnrGroup.pnr,
                    bookingReference: pnrGroup.bookingReference,
                    payable: p.payable,
                    passengerName: p.name,
                    time: report.flightTime,
                    fileName: report.fileName
                });
            });
        });
    });

    for (const trips of passengerTripMap.values()) {
        trips.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    const analyzedReports = reports.map(report => {
        return processSingleReport(
            report, 
            passengerTripMap, 
            duplicatePnrIssuesByReportId.get(report.id) || [], 
            duplicateFileIssuesByReportId.get(report.id) || []
        );
    });

    return [...analyzedReports].sort((a, b) => {
        const dateA = a.flightDate instanceof Date ? a.flightDate : parseISO(a.flightDate);
        const dateB = b.flightDate instanceof Date ? b.flightDate : parseISO(b.flightDate);
        return dateB.getTime() - dateA.getTime();
    });
}


export async function saveFlightReport(report: Omit<FlightReport, 'id'>): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        const docRef = db.collection('flight_reports').doc();
        await docRef.set({ ...report, id: docRef.id });
        revalidatePath('/reports/flight-analysis');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteFlightReport(id: string): Promise<{ success: boolean; error?: string, deletedId?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection('flight_reports').doc(id).delete();
        revalidatePath('/reports/flight-analysis');
        return { success: true, deletedId: id };
    } catch (e: any) {
        console.error(`فشل حذف التقرير: ${id}`, e);
        return { success: false, error: `فشل حذف التقرير: ${e.message}` };
    }
}

export type FlightReportWithId = FlightReport & { id: string };

export async function updateFlightReportSelection(id: string, isSelected: boolean): Promise<{ success: boolean; error?: string, updatedReport?: FlightReportWithId }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const docRef = db.collection('flight_reports').doc(id);
        await docRef.update({
            isSelectedForReconciliation: isSelected,
        });
        const updatedDoc = await docRef.get();
        const updatedData = { id: updatedDoc.id, ...updatedDoc.data() } as FlightReportWithId;
        return { success: true, updatedReport: updatedData };
    } catch (e: any) {
        console.error(`Error updating flight report selection for ${id}:`, e);
        return { success: false, error: e.message };
    }
}
    
export async function updateManualDiscount(id: string, value: number, notes?: string, discountDetails?: ManualDiscount): Promise<{ success: boolean; error?: string, updatedReport?: FlightReportWithId }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const docRef = db.collection('flight_reports').doc(id);
        
        const dataToUpdate: any = {
            manualDiscountValue: value,
        };

        if (discountDetails) {
            dataToUpdate.manualDiscount = discountDetails;
        } else {
            dataToUpdate.manualDiscount = FieldValue.delete();
        }

        if (notes) {
            dataToUpdate.manualDiscountNotes = notes;
        } else {
            dataToUpdate.manualDiscountNotes = FieldValue.delete();
        }

        await docRef.update(dataToUpdate);
        
        // After updating, we need to re-run the audit logic for THIS specific report to get the updated filteredRevenue
        const reports = await getFlightReportsData();
        const reportToProcess = reports.find(r => r.id === id);

        if (!reportToProcess) {
            throw new Error("Report not found after update.");
        }

        // We can reuse the main audit logic but for a single report
        // This is not the most efficient, but it guarantees consistency
        const allAnalyzedReports = await runAdvancedFlightAudit();
        const updatedReport = allAnalyzedReports.find(r => r.id === id);


        if (!updatedReport) {
             throw new Error("Could not find the updated report after analysis.");
        }

        return { success: true, updatedReport: updatedReport as FlightReportWithId };
    } catch (e: any) {
        console.error(`Error updating manual discount for ${id}:`, e);
        return { success: false, error: e.message };
    }
}
