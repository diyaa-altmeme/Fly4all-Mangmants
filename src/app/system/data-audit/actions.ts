

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { BookingEntry, DataAuditIssue } from '@/lib/types';
import { cache } from 'react';
import { runAdvancedFlightAudit } from '@/app/reports/flight-analysis/actions';


// Using cache to avoid re-fetching within the same request
const getBookingsData = cache(async (): Promise<BookingEntry[]> => {
    const db = await getDb();
    if (!db) return [];
    const snapshot = await db.collection('bookings').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingEntry));
});

async function findDuplicatePnrs(): Promise<DataAuditIssue[]> {
    const bookings = await getBookingsData();
    const pnrGroups: { [key: string]: BookingEntry[] } = {};

    bookings.forEach(booking => {
        if (!booking.pnr) return;
        if (!pnrGroups[booking.pnr]) {
            pnrGroups[booking.pnr] = [];
        }
        pnrGroups[booking.pnr].push(booking);
    });
    
    const issues: DataAuditIssue[] = [];
    for (const pnr in pnrGroups) {
        if (pnrGroups[pnr].length > 1) {
            const bookingIds = pnrGroups[pnr].map(b => b.invoiceNumber || b.id).join(', ');
            issues.push({
                id: `pnr-${pnr}`,
                type: 'DUPLICATE_PNR',
                pnr: pnr,
                description: `تم العثور على ${pnrGroups[pnr].length} حجوزات بنفس رقم PNR. أرقام الفواتير: ${bookingIds}`,
                link: `/bookings?search=${pnr}&searchField=pnr`,
                details: pnrGroups[pnr].map(b => ({ id: b.id, invoice: b.invoiceNumber }))
            });
        }
    }
    return issues;
}

async function findNegativeProfitTickets(): Promise<DataAuditIssue[]> {
    const bookings = await getBookingsData();
    const issues: DataAuditIssue[] = [];

    bookings.forEach(booking => {
        booking.passengers.forEach(passenger => {
            const profit = passenger.salePrice - passenger.purchasePrice;
            if (profit < 0) {
                issues.push({
                    id: `${booking.id}-${passenger.id}`,
                    type: 'NEGATIVE_PROFIT',
                    pnr: booking.pnr,
                    description: `الراكب "${passenger.name}" لديه ربح سالب (${profit.toFixed(2)}). البيع: ${passenger.salePrice}, الشراء: ${passenger.purchasePrice}`,
                    link: `/bookings`, // Ideally link to the specific booking
                });
            }
        });
    });

    return issues;
}


async function findZeroPriceTickets(): Promise<DataAuditIssue[]> {
    const bookings = await getBookingsData();
    const issues: DataAuditIssue[] = [];

    bookings.forEach(booking => {
        booking.passengers.forEach(passenger => {
            if (passenger.salePrice === 0 || passenger.purchasePrice === 0) {
                issues.push({
                    id: `${booking.id}-${passenger.id}-zero`,
                    type: 'ZERO_PRICE',
                    pnr: booking.pnr,
                    description: `الراكب "${passenger.name}" لديه سعر شراء أو بيع صفري.`,
                    link: `/bookings`,
                });
            }
        });
    });

    return issues;
}

export async function runDataAudit(options: {
  checkDuplicatePnr: boolean;
  checkNegativeProfit: boolean;
  checkZeroPrices: boolean;
  checkCommissionErrors: boolean;
  checkInvoiceErrors: boolean;
  checkCostMismatch: boolean;
  checkReturnTrip: boolean;
}): Promise<DataAuditIssue[]> {
    const allIssues: DataAuditIssue[] = [];
    const issuePromises: Promise<DataAuditIssue[]>[] = [];

    if (options.checkDuplicatePnr) {
        issuePromises.push(findDuplicatePnrs());
    }
    if (options.checkNegativeProfit) {
        issuePromises.push(findNegativeProfitTickets());
    }
    if (options.checkZeroPrices) {
        issuePromises.push(findZeroPriceTickets());
    }
    
    // Use the unified advanced audit logic
    const reports = await runAdvancedFlightAudit();
    
    reports.forEach(report => {
        if(report.issues) {
            allIssues.push(...report.issues.tripAnalysis);
            allIssues.push(...report.issues.duplicatePnr);
            allIssues.push(...report.issues.fileAnalysis);
            allIssues.push(...report.issues.dataIntegrity);
        }
    });

    
    // TODO: Implement these checks
    if (options.checkCommissionErrors) {
        // issuePromises.push(findCommissionErrors());
    }
    if (options.checkInvoiceErrors) {
        // issuePromises.push(findInvoiceErrors());
    }
    if (options.checkCostMismatch) {
        // issuePromises.push(findCostMismatchErrors());
    }
    
    const results = await Promise.all(issuePromises);
    results.forEach(result => allIssues.push(...result));

    return allIssues;
}

    