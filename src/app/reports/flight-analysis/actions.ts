

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { FlightReport, DataAuditIssue, ManualDiscount, FlightReportWithId } from '@/lib/types';
import { normalizeName } from '@/lib/utils';
import { cache } from 'react';
import { produce } from 'immer';
import { parseISO, isValid } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileoverview Server actions for the Flight Analysis feature.
 * - getFlightReportsData: Fetches all flight reports from Firestore.
 * - runAdvancedFlightAudit: The core logic. Fetches all reports and performs a series of checks:
 *   - findDuplicatePnrsInReports: Detects if the same PNR/BookingRef appears on different flights.
 *   - findDuplicateFiles: Creates a 'fingerprint' for each file to detect if the same report was uploaded multiple times.
 *   - processSingleReport: Processes individual reports to find return trips and calculate discounts.
 * - updateManualDiscount: Server action to add/edit/remove a manual discount on a report.
 * - deleteFlightReport: Server action to delete a report from Firestore.
 */

// يجلب جميع تقارير الرحلات من قاعدة البيانات مع استخدام التخزين المؤقت لتجنب الطلبات المتكررة
export const getFlightReportsData = cache(async (): Promise<FlightReport[]> => {
    const db = await getDb();
    if (!db) return [];
    const snapshot = await db.collection('flight_reports').orderBy('flightDate', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlightReport));
});

// دالة للعثور على حجوزات مكررة (نفس مرجع الحجز في رحلات مختلفة)
async function findDuplicatePnrsInReports(reports: FlightReport[]): Promise<Map<string, DataAuditIssue[]>> {
    const pnrOccurrences = new Map<string, { reportId: string; route: string; date: string; pnr: string; fileName: string; time: string, paxCount: number }[]>();

    // 1. تجميع كل الحجوزات حسب مرجع الحجز
    reports.forEach(report => {
        (report.pnrGroups || []).forEach(pnrGroup => {
            const bookingReference = pnrGroup.bookingReference;
            if (!bookingReference) return;

            if (!pnrOccurrences.has(bookingReference)) {
                pnrOccurrences.set(bookingReference, []);
            }
            pnrOccurrences.get(bookingReference)!.push({
                reportId: report.id, route: report.route, date: report.flightDate,
                pnr: pnrGroup.pnr, fileName: report.fileName, time: report.flightTime, paxCount: pnrGroup.paxCount,
            });
        });
    });

    const issuesByReportId = new Map<string, DataAuditIssue[]>();

    // 2. التحقق من وجود مرجع الحجز في رحلات مختلفة
    for (const [bookingReference, occurrences] of pnrOccurrences.entries()) {
        if (occurrences.length > 1) {
            const uniqueFlights = new Set(occurrences.map(o => `${o.route}|${o.date}`));
            
            if (uniqueFlights.size > 1) { // إذا وجد في أكثر من رحلة
                const flightDetails = Array.from(uniqueFlights).join(' و ');
                const issue: DataAuditIssue = {
                    id: `pnr-${bookingReference}`, type: 'DUPLICATE_PNR', pnr: bookingReference,
                    description: `تم العثور على مرجع الحجز في رحلات مختلفة: ${flightDetails}`,
                    details: occurrences.map(occ => ({ ...occ, bookingReference: bookingReference })), link: '#',
                };
                
                occurrences.forEach(occ => {
                    if (!issuesByReportId.has(occ.reportId)) issuesByReportId.set(occ.reportId, []);
                    if (!issuesByReportId.get(occ.reportId)!.some(i => i.id === issue.id)) {
                         issuesByReportId.get(occ.reportId)!.push(issue);
                    }
                });
            }
        }
    }
    return issuesByReportId;
}

// دالة للعثور على ملفات التقارير المكررة
async function findDuplicateFiles(reports: FlightReport[]): Promise<Map<string, DataAuditIssue[]>> {
    const fileFingerprintMap = new Map<string, { reportId: string; fileName: string; flightDate: string; flightTime: string; route: string; }[]>();
    
    // إنشاء "بصمة" لكل ملف لتمييزه
    reports.forEach(report => {
        const fingerprint = `${report.flightDate}|${report.flightTime}|${report.route}|${report.paxCount}|${(report.totalRevenue || 0).toFixed(2)}`;
        if (!fileFingerprintMap.has(fingerprint)) fileFingerprintMap.set(fingerprint, []);
        fileFingerprintMap.get(fingerprint)!.push({ reportId: report.id, fileName: report.fileName, flightDate: report.flightDate, flightTime: report.flightTime, route: report.route });
    });

    const issuesByReportId = new Map<string, DataAuditIssue[]>();
    for (const [fingerprint, occurrences] of fileFingerprintMap.entries()) {
        if (occurrences.length > 1) {
            // Sort to ensure the "first" one is consistent
            occurrences.sort((a, b) => a.reportId.localeCompare(b.reportId));
            const originalReportId = occurrences[0].reportId;

            const fileNames = occurrences.map(o => o.fileName).join(', ');
            const issue: DataAuditIssue = {
                id: `file-${fingerprint}`, type: 'DUPLICATE_FILE', description: `تم العثور على هذا الملف مكررًا في: ${fileNames}`,
                details: occurrences, link: '#',
            };
            
            occurrences.forEach(occ => {
                // Assign the issue to all reports in the duplicate set
                if (!issuesByReportId.has(occ.reportId)) issuesByReportId.set(occ.reportId, []);
                
                const issueWithOriginal = { ...issue, details: { ...issue.details, originalReportId } };
                issuesByReportId.get(occ.reportId)!.push(issueWithOriginal);
            });
        }
    }
    return issuesByReportId;
}

// دالة لمعالجة تقرير واحد وتحليل رحلات الذهاب والعودة وحساب الخصومات
const processSingleReport = (report: FlightReport, passengerTripMap: Map<string, any[]>, duplicatePnrIssues: DataAuditIssue[], fileAnalysisIssues: DataAuditIssue[]): FlightReport => {
    return produce(report, draftReport => {
        draftReport.issues = { tripAnalysis: [], duplicatePnr: duplicatePnrIssues, fileAnalysis: fileAnalysisIssues, dataIntegrity: [] };
        draftReport.totalDiscount = 0;
        draftReport.tripTypeCounts = { oneWay: 0, roundTrip: 0 };
        const processedPassengersForTripCount = new Set<string>();

        // Check if this report is a duplicate and NOT the original one
        const fileIssue = fileAnalysisIssues.find(issue => issue.type === 'DUPLICATE_FILE');
        const isDuplicateAndNotOriginal = fileIssue && (fileIssue.details as any).originalReportId !== draftReport.id;
        
        if (isDuplicateAndNotOriginal) {
            // If it's a duplicate file and not the first one, zero out its financial contributions
            draftReport.totalDiscount = 0;
            draftReport.manualDiscountValue = 0;
            draftReport.filteredRevenue = 0;
            // Also zero out passenger-level prices to reflect this
            (draftReport.passengers || []).forEach(p => {
                p.actualPrice = 0;
            });
        } else {
             (draftReport.passengers || []).forEach(passenger => {
                const uniqueKey = `${normalizeName(passenger.bookingReference)}|${normalizeName(passenger.name)}|${passenger.passportNumber || ''}`;
                const allTripsForPassengerOnPnr = passengerTripMap.get(uniqueKey) || [];
                
                if (allTripsForPassengerOnPnr.length > 1) {
                    if (!processedPassengersForTripCount.has(uniqueKey)) {
                        draftReport.tripTypeCounts.roundTrip += 1;
                        processedPassengersForTripCount.add(uniqueKey);
                    }

                    const currentTripInstance = allTripsForPassengerOnPnr.find(t => t.reportId === draftReport.id);
                    if (currentTripInstance) {
                        const tripIndex = allTripsForPassengerOnPnr.indexOf(currentTripInstance);
                        if (tripIndex === 0) { passenger.tripType = 'DEPARTURE'; passenger.actualPrice = passenger.payable; } 
                        else if (tripIndex > 0) { passenger.tripType = 'RETURN'; passenger.actualPrice = 0; passenger.departureDate = allTripsForPassengerOnPnr[0].date.toISOString(); draftReport.totalDiscount! += passenger.payable; }
                    }
                    
                    if (!draftReport.issues!.tripAnalysis.some(issue => issue.id === `return-${uniqueKey}`)) {
                        draftReport.issues!.tripAnalysis.push({ id: `return-${uniqueKey}`, type: 'UNMATCHED_RETURN', pnr: passenger.bookingReference, description: `رحلة ذهاب وعودة للمسافر: ${passenger.name}`, details: allTripsForPassengerOnPnr });
                    }
                } else {
                    if (!processedPassengersForTripCount.has(uniqueKey)) {
                        draftReport.tripTypeCounts.oneWay += 1;
                        processedPassengersForTripCount.add(uniqueKey);
                    }
                    passenger.tripType = 'SINGLE'; passenger.actualPrice = passenger.payable;
                }
            });
            
            let manualDiscountValue = 0;
            if(draftReport.manualDiscount?.type === 'fixed') { manualDiscountValue = draftReport.manualDiscount.value || 0; } 
            else if (draftReport.manualDiscount?.type === 'per_passenger') {
                const passengerCounts = (draftReport.passengers || []).reduce((acc, p) => { acc[p.passengerType || 'Adult'] = (acc[p.passengerType || 'Adult'] || 0) + 1; return acc; }, {} as Record<string, number>);
                manualDiscountValue = ((passengerCounts.Adult || 0) * (draftReport.manualDiscount.perAdult || 0)) + ((passengerCounts.Child || 0) * (draftReport.manualDiscount.perChild || 0)) + ((passengerCounts.Infant || 0) * (draftReport.manualDiscount.perInfant || 0));
            }

            draftReport.manualDiscountValue = manualDiscountValue;
            draftReport.filteredRevenue = (draftReport.totalRevenue || 0) - (draftReport.totalDiscount || 0) - manualDiscountValue;
        }

    });
};

// الدالة الرئيسية التي تشغل جميع عمليات التدقيق
export async function runAdvancedFlightAudit(): Promise<FlightReport[]> {
    const reports = await getFlightReportsData();
    if (reports.length === 0) return [];
    
    const [duplicatePnrIssuesByReportId, duplicateFileIssuesByReportId] = await Promise.all([ findDuplicatePnrsInReports(reports), findDuplicateFiles(reports) ]);
    
    const passengerTripMap = new Map<string, any[]>();
    reports.forEach(report => {
        (report.pnrGroups || []).forEach(pnrGroup => {
            pnrGroup.passengers.forEach(p => {
                const uniqueKey = `${normalizeName(pnrGroup.bookingReference)}|${normalizeName(p.name)}|${p.passportNumber || ''}`;
                if (!passengerTripMap.has(uniqueKey)) passengerTripMap.set(uniqueKey, []);
                passengerTripMap.get(uniqueKey)!.push({ reportId: report.id, date: parseISO(report.flightDate), bookingReference: pnrGroup.bookingReference });
            });
        });
    });

    for (const trips of passengerTripMap.values()) { trips.sort((a, b) => a.date.getTime() - b.date.getTime()); }

    const analyzedReports = reports.map(report => processSingleReport(report, passengerTripMap, duplicatePnrIssuesByReportId.get(report.id) || [], duplicateFileIssuesByReportId.get(report.id) || []));

    return [...analyzedReports].sort((a, b) => parseISO(b.flightDate).getTime() - parseISO(a.flightDate).getTime());
}

// دالة لحفظ تقرير جديد (تستخدمها أداة الاستيراد)
export async function saveFlightReport(report: Omit<FlightReport, 'id'>): Promise<{ success: boolean; error?: string }> {
    const db = await getDb(); if (!db) return { success: false, error: "Database not available." };
    try {
        const docRef = db.collection('flight_reports').doc(); await docRef.set({ ...report, id: docRef.id });
        revalidatePath('/reports/flight-analysis'); return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// دالة لحذف تقرير
export async function deleteFlightReport(id: string): Promise<{ success: boolean; error?: string, deletedId?: string }> {
    const db = await getDb(); if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection('flight_reports').doc(id).delete();
        revalidatePath('/reports/flight-analysis'); return { success: true, deletedId: id };
    } catch (e: any) { console.error(`فشل حذف التقرير: ${id}`, e); return { success: false, error: `فشل حذف التقرير: ${e.message}` }; }
}

// دالة لتحديث حالة التحديد (للتحاسب)
export async function updateFlightReportSelection(id: string, isSelected: boolean): Promise<{ success: boolean; error?: string, updatedReport?: FlightReportWithId }> {
    const db = await getDb(); if (!db) return { success: false, error: "Database not available." };
    try {
        const docRef = db.collection('flight_reports').doc(id); await docRef.update({ isSelectedForReconciliation: isSelected });
        const updatedDoc = await docRef.get(); const updatedData = { id: updatedDoc.id, ...updatedDoc.data() } as FlightReportWithId;
        return { success: true, updatedReport: updatedData };
    } catch (e: any) { console.error(`Error updating selection for ${id}:`, e); return { success: false, error: e.message }; }
}

// دالة لتحديث الخصم اليدوي
export async function updateManualDiscount(id: string, value: number, notes?: string, discountDetails?: ManualDiscount): Promise<{ success: boolean; error?: string, updatedReport?: FlightReportWithId }> {
    const db = await getDb(); if (!db) return { success: false, error: "Database not available." };
    try {
        const docRef = db.collection('flight_reports').doc(id);
        const dataToUpdate: any = { manualDiscountValue: value };
        if (discountDetails) { dataToUpdate.manualDiscount = discountDetails; } else { dataToUpdate.manualDiscount = FieldValue.delete(); }
        if (notes) { dataToUpdate.manualDiscountNotes = notes; } else { dataToUpdate.manualDiscountNotes = FieldValue.delete(); }
        await docRef.update(dataToUpdate);
        
        const allAnalyzedReports = await runAdvancedFlightAudit(); const updatedReport = allAnalyzedReports.find(r => r.id === id);
        if (!updatedReport) { throw new Error("Could not find the updated report after analysis."); }
        return { success: true, updatedReport: updatedReport as FlightReportWithId };
    } catch (e: any) { console.error(`Error updating manual discount for ${id}:`, e); return { success: false, error: e.message }; }
}

