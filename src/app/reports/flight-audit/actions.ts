

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { FlightReport, DataAuditIssue } from '@/lib/types';
import { normalizeName } from '@/lib/utils';
import { cache } from 'react';

// Using cache to avoid re-fetching within the same request
const getFlightReportsData = cache(async (): Promise<FlightReport[]> => {
    const db = await getDb();
    if (!db) return [];
    const snapshot = await db.collection('flight_reports').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlightReport));
});


async function findDuplicatePnrsInReports(): Promise<DataAuditIssue[]> {
    const reports = await getFlightReportsData();
    const pnrMap: { [pnr: string]: { reportId: string, fileName: string, passengerName: string, route: string, date: string, time: string }[] } = {};

    reports.forEach(report => {
        (report.pnrGroups || []).forEach(pnrGroup => {
             pnrGroup.passengers.forEach(passenger => {
                const pnr = pnrGroup.pnr;
                if (!pnr) return;
                if (!pnrMap[pnr]) pnrMap[pnr] = [];
                pnrMap[pnr].push({ 
                    reportId: report.id, 
                    fileName: report.fileName, 
                    passengerName: passenger.name,
                    route: report.route,
                    date: report.flightDate,
                    time: report.flightTime
                });
            });
        })
    });

    const issues: DataAuditIssue[] = [];
    for (const pnr in pnrMap) {
        if (pnrMap[pnr].length > 1) {
            const files = [...new Set(pnrMap[pnr].map(p => p.fileName))].join(', ');
            issues.push({
                id: `pnr-${pnr}`,
                type: 'DUPLICATE_PNR',
                pnr: pnr,
                description: `تم العثور على PNR مكرر في الملفات: ${files}`,
                link: '#', // Link could be more specific in a real implementation
                details: pnrMap[pnr]
            });
        }
    }
    return issues;
}


async function findReturnTrips(): Promise<DataAuditIssue[]> {
    const reports = await getFlightReportsData();
    const passengerTrips: { [normalizedName: string]: { reportId: string; route: string; date: string; pnr: string }[] } = {};
    
    reports.forEach(report => {
        report.passengers.forEach(p => {
            if (!p.name) return;
            const normalized = normalizeName(p.name);
            if (!passengerTrips[normalized]) passengerTrips[normalized] = [];
            passengerTrips[normalized].push({
                reportId: report.id,
                route: report.route,
                date: report.flightDate,
                pnr: p.pnrClass,
            });
        });
    });

    const issues: DataAuditIssue[] = [];
    for(const name in passengerTrips) {
        if(passengerTrips[name].length > 1) {
            const trips = passengerTrips[name].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            for(let i=0; i < trips.length - 1; i++) {
                const tripA = trips[i];
                const tripB = trips[i+1];
                
                const [fromA, toA] = tripA.route.split('-').map(s => s.trim());
                const [fromB, toB] = tripB.route.split('-').map(s => s.trim());

                if (fromA === toB && toA === fromB) {
                     issues.push({
                        id: `return-${name}-${i}`,
                        type: 'UNMATCHED_RETURN',
                        pnr: `${tripA.pnr} / ${tripB.pnr}`,
                        description: `رحلة ذهاب وعودة محتملة للمسافر "${name}". الذهاب: ${tripA.route} في ${tripA.date}. العودة: ${tripB.route} في ${tripB.date}.`,
                        link: `#`,
                     });
                }
            }
        }
    }
    return issues;
}


export async function runAdvancedFlightAudit(options: {
  checkDuplicatePnr: boolean;
  checkReturnTrip: boolean;
}): Promise<DataAuditIssue[]> {
    const allIssues: DataAuditIssue[] = [];
    const issuePromises: Promise<DataAuditIssue[]>[] = [];

    if (options.checkDuplicatePnr) {
        issuePromises.push(findDuplicatePnrsInReports());
    }
    if (options.checkReturnTrip) {
        issuePromises.push(findReturnTrips());
    }
    
    const results = await Promise.all(issuePromises);
    results.forEach(result => allIssues.push(...result));

    return allIssues;
}
