import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { MatchingField, ImportFieldSettings, CustomRelationField } from './types';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePNR(pnr: string): string {
  if (!pnr) return "";
  return String(pnr).trim().toUpperCase();
}

export function normalizeName(name: string): string {
  if (!name) return "";
  let s = String(name).normalize("NFKD");
  s = s.replace(/[\u0300-\u036f]/g, ""); // Basic remove diacritics
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  return s;
}

export function parseAmount(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).replace(/[^0-9.-]+/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseDateTime(dateRaw: any, timeRaw: any): { date: string | null; time: string | null } {
  let date: string | null = null;
  let time: string | null = null;

  if (dateRaw) {
    if (dateRaw instanceof Date) {
      date = dateRaw.toISOString().split('T')[0];
    } else {
      date = String(dateRaw).split("T")[0];
      if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(dateRaw)) {
        const parts = String(dateRaw).split("/");
        if (parts.length === 3) {
          const dd = parts[0].padStart(2, "0");
          const mm = parts[1].padStart(2, "0");
          const yyyy = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          date = `${yyyy}-${mm}-${dd}`;
        }
      }
    }
  }

  if (timeRaw) {
    time = String(timeRaw).trim();
    const m = time.match(/^(\d{1,2}):(\d{2})/);
    if (m) time = `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
  }

  return { date, time };
}

export const normalizeRecord = (
  record: any,
  columnMapping: Record<string, string>,
  relationFields: CustomRelationField[],
  importFieldsSettings?: ImportFieldSettings,
) => {
    const normalized: { [key: string]: any } = {};
    const excelHeaders = Object.keys(record).map(h => h.toLowerCase().trim());

    relationFields.forEach(field => {
        const mappedHeader = columnMapping[field.id];
        
        let value: any = undefined;
        let foundHeader: string | undefined;

        if (mappedHeader && excelHeaders.includes(mappedHeader.toLowerCase().trim())) {
            foundHeader = Object.keys(record).find(h => h.toLowerCase().trim() === mappedHeader.toLowerCase().trim());
        } else {
            const fieldSettings = importFieldsSettings?.[field.id];
            const aliases = fieldSettings?.aliases || [field.label];
            const allPossibleNames = Array.from(new Set(
                [field.id, field.label, ...aliases].map(s => s.toLowerCase().trim())
            ));

            for (const alias of allPossibleNames) {
                foundHeader = excelHeaders.find(h => h === alias);
                if (foundHeader) break;
            }
        }
        
        if (foundHeader) {
            value = record[foundHeader];
        }

        if (value === undefined) {
            normalized[field.id] = field.defaultValue !== undefined ? field.defaultValue : (field.dataType === 'number' ? 0 : '');
        } else if (field.dataType === 'number') {
            normalized[field.id] = parseFloat(String(value).trim().replace(/,/g, '')) || 0;
        } else {
            normalized[field.id] = String(value).trim();
        }
    });

    return normalized;
};
