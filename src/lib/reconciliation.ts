
/**
 * @fileoverview Core reconciliation logic.
 * This file contains the algorithm for matching transactions between two account statements.
 * It takes company and supplier data, applies matching rules, and returns the results.
 */

import type { Currency, BookingEntry } from './types';
import Fuse from 'fuse.js';
import { getDb } from './firebase-admin';
import { normalizeRecord } from './utils';
import { cache } from 'react';

// Define data structures for transactions
type Transaction = {
  id: string | number;
  date: string;
  amount: number;
  description?: string;
  [key: string]: any; // Allow other properties
};

export type ReconciledRecordStatus = 'MATCHED' | 'PARTIAL_MATCH' | 'MISSING_IN_COMPANY' | 'MISSING_IN_SUPPLIER';

export interface ReconciledRecord {
    [key: string]: any; // Allow dynamic properties
    status: ReconciledRecordStatus;
    details: string[];
    priceDifference?: number;
}

export interface ReconciliationSummary {
    totalCompanyRecords: number;
    totalSupplierRecords: number;
    totalRecords: number;
    matched: number;
    partialMatch: number;
    missingInCompany: number;
    missingInSupplier: number;
    totalPriceDifference: number;
}

export interface ReconciliationResult {
    summary: ReconciliationSummary;
    records: ReconciledRecord[];
}


type MatchingRule = 
  | { type: 'exact' }
  | { type: 'fuzzy', tolerance: number }
  | { type: 'numeric_diff', maxDiff: number };

export type MatchingField = {
    id: string;
    label: string;
    enabled: boolean;
    deletable: boolean;
    dataType: 'string' | 'number';
    rule: MatchingRule;
};


// Define settings for reconciliation
export type ReconciliationSettings = {
    columnMapping: {
        company: { [key: string]: string };
        supplier: { [key: string]: string };
    };
    matchingFields: MatchingField[];
    aggregation: {
        enabled: boolean;
        aggregationKey: string;
        aggregationValueField: string;
    };
};

export const defaultSettings: ReconciliationSettings = {
    columnMapping: {
        company: { pnr: 'BNR', ticketNumber: 'Ticket', passengerName: 'الاسم', price: 'السعر' },
        supplier: { pnr: 'PNR', ticketNumber: 'Ticket Number', passengerName: 'Passenger Name', price: 'Price' },
    },
    matchingFields: [
        { id: 'pnr', label: 'BNR/PNR', enabled: true, deletable: false, dataType: 'string', rule: { type: 'exact' } },
        { id: 'ticketNumber', label: 'رقم التذكرة', enabled: true, deletable: false, dataType: 'string', rule: { type: 'exact' } },
        { id: 'passengerName', label: 'اسم المسافر', enabled: true, deletable: false, dataType: 'string', rule: { type: 'fuzzy', tolerance: 85 } },
        { id: 'price', label: 'السعر', enabled: true, deletable: false, dataType: 'number', rule: { type: 'numeric_diff', maxDiff: 1 } },
    ],
    aggregation: {
        enabled: false,
        aggregationKey: 'pnr',
        aggregationValueField: 'price',
    },
};

export type FilterRule = {
    id: string;
    field: string;
    condition: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: string | number;
};


// The original performReconciliation function can remain for the other tool if needed.
export function performReconciliation(
  companyData: any[],
  supplierData: any[],
  settings: ReconciliationSettings,
  currency: Currency,
  filters: FilterRule[] = []
): ReconciliationResult {
    const { columnMapping, matchingFields, aggregation } = settings;
    const enabledFields = matchingFields.filter(f => f.enabled);

    let companyRecords = companyData.map(rec => normalizeRecord(rec, columnMapping.company, enabledFields, settings.importFieldsSettings || {}));
    let rawSupplierRecords = supplierData.map(rec => normalizeRecord(rec, columnMapping.supplier, enabledFields, settings.importFieldsSettings || {}));

    const filteredCompanyRecords = applyFilters(companyRecords, filters);
    const filteredSupplierRecords = applyFilters(rawSupplierRecords, filters);
    
    let supplierRecordsPool = aggregation.enabled 
        ? aggregateSupplierRecords(filteredSupplierRecords, settings) 
        : filteredSupplierRecords;

    const matched: ReconciledRecord[] = [];
    const partialMatch: ReconciledRecord[] = [];
    const missingInSupplier: ReconciledRecord[] = [];

    filteredCompanyRecords.forEach(companyRec => {
        let bestMatchIndex = -1;
        let bestMatchResult: { match: boolean, partial: boolean, details: string[], priceDifference: number } | null = null;

        for (let i = 0; i < supplierRecordsPool.length; i++) {
            const supplierRec = supplierRecordsPool[i];
            const result = recordsMatch(companyRec, supplierRec, enabledFields);
            
            if (result.match) {
                 if (!result.partial) {
                    bestMatchIndex = i;
                    bestMatchResult = result;
                    break;
                }
                if (!bestMatchResult) {
                    bestMatchIndex = i;
                    bestMatchResult = result;
                }
            }
        }
        
        if (bestMatchResult) {
            const supplierRec = supplierRecordsPool[bestMatchIndex];
             if (bestMatchResult.partial) {
                partialMatch.push({ 
                    ...companyRec, 
                    status: 'PARTIAL_MATCH', 
                    details: bestMatchResult.details,
                    priceDifference: bestMatchResult.priceDifference 
                });
            } else {
                matched.push({ ...companyRec, status: 'MATCHED', details: [] });
            }
            supplierRecordsPool.splice(bestMatchIndex, 1);
        } else {
            missingInSupplier.push({ ...companyRec, status: 'MISSING_IN_SUPPLIER', details: ['مفقود لدى المورد'] });
        }
    });

    const missingInCompany: ReconciledRecord[] = supplierRecordsPool.map(rec => ({
        ...rec,
        status: 'MISSING_IN_COMPANY',
        details: ['مفقود في نظامك'],
    }));
    
    const allRecords = [...matched, ...partialMatch, ...missingInCompany, ...missingInSupplier];
    const finalRecords = allRecords.map(rec => {
        const finalRec: ReconciledRecord = { status: rec.status, details: rec.notes, priceDifference: rec.priceDifference };
        enabledFields.forEach(field => {
            finalRec[field.id] = rec[field.id];
        });
        return finalRec;
    })

    const summary: ReconciliationSummary = {
        totalCompanyRecords: filteredCompanyRecords.length,
        totalSupplierRecords: filteredSupplierRecords.length,
        matched: matched.length,
        partialMatch: partialMatch.length,
        missingInSupplier: missingInSupplier.length,
        missingInCompany: missingInCompany.length,
        totalRecords: finalRecords.length,
        totalPriceDifference: partialMatch.reduce((sum, rec) => sum + (rec.priceDifference || 0), 0),
    };
    
    return {
        summary,
        records: finalRecords
    };
}

// Check if two records match based on the new detailed rules
const recordsMatch = (companyRec: ReconciledRecord, supplierRec: ReconciledRecord, fields: MatchingField[]): { match: boolean, partial: boolean, details: string[], priceDifference: number } => {
    let isPartial = false;
    const details: string[] = [];
    let priceDifference = 0;

    for (const field of fields) {
        if (!field.enabled) continue;

        const companyValue = companyRec[field.id];
        const supplierValue = supplierRec[field.id];

        switch (field.rule.type) {
            case 'exact':
                if (String(companyValue).toLowerCase() !== String(supplierValue).toLowerCase()) {
                    details.push(`${field.label}: (${companyValue} ≠ ${supplierValue})`);
                    return { match: false, partial: false, details, priceDifference };
                }
                break;
            case 'fuzzy':
                const strCompany = String(companyValue);
                const strSupplier = String(supplierValue);
                
                if (!strCompany || !strSupplier) { // Handle empty strings
                    if (strCompany !== strSupplier) {
                         details.push(`${field.label}: (${strCompany} ≠ ${strSupplier})`);
                         return { match: false, partial: false, details, priceDifference };
                    }
                    break;
                }
                const fuse = new Fuse([strSupplier], { threshold: 1 - (field.rule.tolerance / 100), includeScore: true });
                const result = fuse.search(strCompany);
                if (result.length === 0) {
                     details.push(`${field.label}: (${strCompany} ≠ ${strSupplier})`);
                    return { match: false, partial: false, details, priceDifference };
                }
                if (strCompany.toLowerCase() !== strSupplier.toLowerCase()) {
                    isPartial = true; 
                    details.push(`${field.label}: ${strCompany} ≈ ${strSupplier} (تشابه ${((1 - (result[0].score || 0)) * 100).toFixed(0)}%)`);
                }
                break;
            case 'numeric_diff':
                const numCompany = Number(companyValue);
                const numSupplier = Number(supplierValue);
                const diff = Math.abs(numCompany - numSupplier);
                 if (diff > field.rule.maxDiff) {
                    details.push(`${field.label}: |${numCompany} - ${numSupplier}| = ${diff.toFixed(2)} > ${field.rule.maxDiff}`);
                    return { match: false, partial: false, details, priceDifference };
                }
                if (diff > 0) { // If there is a difference within tolerance, it's still partial.
                    isPartial = true;
                    details.push(`${field.label} فرق: ${diff.toFixed(2)}`);
                }
                
                if (field.id === 'price') {
                    priceDifference = numCompany - numSupplier;
                }
                break;
        }
    }

    return { match: true, partial: isPartial, details, priceDifference };
}

const aggregateSupplierRecords = (records: any[], settings: ReconciliationSettings) => {
    const { aggregationKey, aggregationValueField } = settings.aggregation;
    if (!aggregationKey || !aggregationValueField) return records;

    const grouped = records.reduce((acc, record) => {
        const key = record[aggregationKey];
        if (!key) { // If the key doesn't exist, treat it as a unique record
            acc[JSON.stringify(record)] = record;
            return acc;
        }
        if (!acc[key]) {
            acc[key] = { ...record, [aggregationValueField]: 0 };
        }
        acc[key][aggregationValueField] += record[aggregationValueField];
        return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
}

const applyFilters = (records: any[], filters: FilterRule[]): any[] => {
    if (filters.length === 0) {
        return records;
    }
    return records.filter(record => {
        return filters.every(filter => {
            const recordValue = record[filter.field];
            const filterValue = filter.value;

            if (recordValue === undefined) return false;

            const numRecordValue = parseFloat(recordValue);
            const numFilterValue = parseFloat(filterValue as string);

            switch (filter.condition) {
                case 'equals':
                    return String(recordValue).toLowerCase() === String(filterValue).toLowerCase();
                case 'contains':
                    return String(recordValue).toLowerCase().includes(String(filterValue).toLowerCase());
                case 'greater_than':
                    return !isNaN(numRecordValue) && !isNaN(numFilterValue) && numRecordValue > numFilterValue;
                case 'less_than':
                    return !isNaN(numRecordValue) && !isNaN(numFilterValue) && numRecordValue < numFilterValue;
                default:
                    return true;
            }
        });
    });
};
